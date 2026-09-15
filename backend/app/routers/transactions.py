from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, Transaction, User
from app.routers.items import serialize
from app.schemas import PinRequest, TransactionOut, TransactionRequest
from app.security import generate_pin, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def to_out(db: Session, tx: Transaction, pin: str | None = None) -> TransactionOut:
    out = TransactionOut.model_validate(tx)
    item = db.get(Item, tx.item_id)
    if item is not None:
        out.item = serialize(db, item)
    owner = db.get(User, tx.owner_id)
    borrower = db.get(User, tx.borrower_id)
    out.owner_username = owner.username if owner else None
    out.borrower_username = borrower.username if borrower else None
    out.pickup_pin = pin
    return out


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    role: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TransactionOut]:
    stmt = select(Transaction)
    if role == "owner":
        stmt = stmt.where(Transaction.owner_id == user.id)
    elif role == "borrower":
        stmt = stmt.where(Transaction.borrower_id == user.id)
    else:
        stmt = stmt.where((Transaction.owner_id == user.id) | (Transaction.borrower_id == user.id))
    rows = db.scalars(stmt.order_by(Transaction.created_at.desc())).all()
    return [to_out(db, tx) for tx in rows]


@router.post("/request", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def request_item(
    payload: TransactionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionOut:
    item = db.get(Item, payload.item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That listing is no longer available.")
    if item.owner_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot request your own listing.")
    if item.status != "Available":
        raise HTTPException(status.HTTP_409_CONFLICT, "This item is not available right now.")
    duplicate = db.scalar(
        select(Transaction).where(
            Transaction.item_id == item.id,
            Transaction.borrower_id == user.id,
            Transaction.status.in_(["Pending", "Active"]),
        )
    )
    if duplicate:
        raise HTTPException(status.HTTP_409_CONFLICT, "You already have an open request for this item.")

    tx = Transaction(item_id=item.id, borrower_id=user.id, owner_id=item.owner_id, status="Pending")
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return to_out(db, tx)


@router.post("/{tx_id}/approve", response_model=TransactionOut)
def approve(
    tx_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionOut:
    tx = db.get(Transaction, tx_id)
    if tx is None or tx.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That request does not exist.")
    if tx.status != "Pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "This request has already been handled.")

    pin = generate_pin()
    tx.pickup_pin_hash = hash_password(pin)
    tx.status = "Active"
    tx.start_date = datetime.now(timezone.utc)
    item = db.get(Item, tx.item_id)
    if item is not None:
        item.status = "Reserved"
        if item.listing_type == "RENT" and item.max_rental_days:
            tx.due_date = datetime.now(timezone.utc) + timedelta(days=item.max_rental_days)
    # Other pending requests for the same item are rejected automatically.
    for other in db.scalars(
        select(Transaction).where(
            Transaction.item_id == tx.item_id, Transaction.id != tx.id, Transaction.status == "Pending"
        )
    ).all():
        other.status = "Rejected"
    db.commit()
    db.refresh(tx)
    # The plaintext PIN is returned exactly once, to the borrower's counterpart flow.
    return to_out(db, tx, pin=pin)


@router.post("/{tx_id}/reject", response_model=TransactionOut)
def reject(tx_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> TransactionOut:
    tx = db.get(Transaction, tx_id)
    if tx is None or tx.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That request does not exist.")
    if tx.status != "Pending":
        raise HTTPException(status.HTTP_409_CONFLICT, "This request has already been handled.")
    tx.status = "Rejected"
    db.commit()
    db.refresh(tx)
    return to_out(db, tx)


@router.post("/{tx_id}/verify-pin", response_model=TransactionOut)
def verify_pin(
    tx_id: int,
    payload: PinRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionOut:
    tx = db.get(Transaction, tx_id)
    if tx is None or tx.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That handover does not exist.")
    if tx.status != "Active" or tx.pickup_pin_hash is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "This handover is not awaiting a PIN.")
    if not verify_password(payload.pin, tx.pickup_pin_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That PIN does not match. Please try again.")
    tx.pin_verified = True
    item = db.get(Item, tx.item_id)
    if item is not None:
        item.status = "Rented" if item.listing_type == "RENT" else "Sold"
    db.commit()
    db.refresh(tx)
    return to_out(db, tx)


@router.post("/{tx_id}/return", response_model=TransactionOut)
def mark_returned(
    tx_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionOut:
    tx = db.get(Transaction, tx_id)
    if tx is None or tx.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That transaction does not exist.")
    if not tx.pin_verified:
        raise HTTPException(status.HTTP_409_CONFLICT, "The pickup PIN has not been confirmed yet.")

    tx.return_date = datetime.now(timezone.utc)
    tx.status = "Completed"
    item = db.get(Item, tx.item_id)
    if item is not None and item.listing_type == "RENT":
        item.status = "Available"
    for participant_id in (tx.owner_id, tx.borrower_id):
        participant = db.get(User, participant_id)
        if participant is not None:
            participant.total_transactions += 1
    db.commit()
    db.refresh(tx)
    return to_out(db, tx)


@router.post("/{tx_id}/cancel", response_model=TransactionOut)
def cancel(tx_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> TransactionOut:
    tx = db.get(Transaction, tx_id)
    if tx is None or user.id not in (tx.owner_id, tx.borrower_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That transaction does not exist.")
    if tx.status in ("Completed", "Cancelled"):
        raise HTTPException(status.HTTP_409_CONFLICT, "This transaction is already closed.")
    tx.status = "Cancelled"
    item = db.get(Item, tx.item_id)
    if item is not None:
        item.status = "Available"
    db.commit()
    db.refresh(tx)
    return to_out(db, tx)
