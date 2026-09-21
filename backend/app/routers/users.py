from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, Message, Transaction, User
from app.schemas import DashboardStats, OwnerPublic, UserOut, UserUpdate
from app.security import get_current_user
from app.services.distance_service import fuzz_coordinates

router = APIRouter(prefix="/api/users", tags=["users"])


def owner_public(db: Session, user: User) -> OwnerPublic:
    active = db.scalar(
        select(func.count(Item.id)).where(Item.owner_id == user.id, Item.status == "Available")
    )
    return OwnerPublic(
        id=user.id,
        username=user.username,
        area_name=user.area_name,
        created_at=user.created_at,
        total_transactions=user.total_transactions,
        active_listings=active or 0,
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    if payload.username and payload.username != user.username:
        taken = db.scalar(select(User).where(User.username == payload.username, User.id != user.id))
        if taken:
            raise HTTPException(status.HTTP_409_CONFLICT, "That username is already taken.")
        user.username = payload.username
    if payload.area_name is not None:
        user.area_name = payload.area_name
    if payload.latitude is not None and payload.longitude is not None:
        user.latitude, user.longitude = fuzz_coordinates(payload.latitude, payload.longitude)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me/stats", response_model=DashboardStats)
def my_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DashboardStats:
    def count(stmt) -> int:
        return db.scalar(stmt) or 0

    return DashboardStats(
        total_listings=count(select(func.count(Item.id)).where(Item.owner_id == user.id)),
        active_listings=count(
            select(func.count(Item.id)).where(Item.owner_id == user.id, Item.status == "Available")
        ),
        pending_requests=count(
            select(func.count(Transaction.id)).where(
                Transaction.owner_id == user.id, Transaction.status == "Pending"
            )
        ),
        active_transactions=count(
            select(func.count(Transaction.id)).where(
                (Transaction.owner_id == user.id) | (Transaction.borrower_id == user.id),
                Transaction.status == "Active",
            )
        ),
        completed_transactions=count(
            select(func.count(Transaction.id)).where(
                (Transaction.owner_id == user.id) | (Transaction.borrower_id == user.id),
                Transaction.status.in_(["Completed", "Returned"]),
            )
        ),
        unread_messages=count(
            select(func.count(Message.id)).where(
                Message.receiver_id == user.id, Message.is_read.is_(False)
            )
        ),
    )


@router.get("/{user_id}", response_model=OwnerPublic)
def public_profile(user_id: int, db: Session = Depends(get_db)) -> OwnerPublic:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That member does not exist.")
    return owner_public(db, user)

