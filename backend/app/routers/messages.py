from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, Message, User
from app.schemas import ConversationOut, MessageCreate, MessageOut
from app.security import get_current_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/conversations", response_model=list[ConversationOut])
def conversations(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[ConversationOut]:
    rows = db.scalars(
        select(Message)
        .where((Message.sender_id == user.id) | (Message.receiver_id == user.id))
        .order_by(Message.timestamp)
    ).all()

    grouped: dict[str, ConversationOut] = {}
    for msg in rows:
        partner_id = msg.receiver_id if msg.sender_id == user.id else msg.sender_id
        key = f"{msg.item_id}:{partner_id}"
        partner = db.get(User, partner_id)
        item = db.get(Item, msg.item_id)
        entry = grouped.get(key)
        unread = 1 if msg.receiver_id == user.id and not msg.is_read else 0
        if entry is None:
            grouped[key] = ConversationOut(
                id=key,
                item_id=msg.item_id,
                item_title=item.title if item else "Removed listing",
                item_image=item.image_path if item else None,
                partner_id=partner_id,
                partner_username=partner.username if partner else "Former member",
                last_message=msg.message,
                last_timestamp=msg.timestamp,
                unread=unread,
            )
        else:
            entry.last_message = msg.message
            entry.last_timestamp = msg.timestamp
            entry.unread += unread

    return sorted(grouped.values(), key=lambda c: c.last_timestamp, reverse=True)


@router.get("/{item_id}/{partner_id}", response_model=list[MessageOut])
def thread(
    item_id: int,
    partner_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Message]:
    rows = list(
        db.scalars(
            select(Message)
            .where(
                Message.item_id == item_id,
                ((Message.sender_id == user.id) & (Message.receiver_id == partner_id))
                | ((Message.sender_id == partner_id) & (Message.receiver_id == user.id)),
            )
            .order_by(Message.timestamp)
        ).all()
    )
    for msg in rows:
        if msg.receiver_id == user.id:
            msg.is_read = True
    db.commit()
    return rows


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Message:
    if payload.receiver_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot message yourself.")
    if db.get(Item, payload.item_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That listing is no longer available.")
    if db.get(User, payload.receiver_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That member does not exist.")

    msg = Message(
        item_id=payload.item_id,
        sender_id=user.id,
        receiver_id=payload.receiver_id,
        message=payload.message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
