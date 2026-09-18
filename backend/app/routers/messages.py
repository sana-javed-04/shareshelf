import json
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import Item, Message, User
from app.schemas import ConversationOut, MessageCreate, MessageOut
from app.security import decode_token, get_current_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message_data: dict, receiver_id: int):
        if receiver_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[receiver_id]:
                try:
                    await connection.send_text(json.dumps(message_data))
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(receiver_id, dead)


manager = ConnectionManager()


@router.websocket("/ws/{token}")
async def websocket_chat_endpoint(websocket: WebSocket, token: str):
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                payload = json.loads(data_text)
            except json.JSONDecodeError:
                continue

            receiver_id = payload.get("receiver_id")
            item_id = payload.get("item_id")
            content = payload.get("message", "").strip()

            if not receiver_id or not item_id or not content:
                continue
            if receiver_id == user_id:
                continue

            db: Session = SessionLocal()
            try:
                if not db.get(Item, item_id) or not db.get(User, receiver_id):
                    continue

                msg = Message(
                    item_id=item_id,
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    message=content,
                )
                db.add(msg)
                db.commit()
                db.refresh(msg)

                timestamp_val = (
                    msg.created_at.isoformat()
                    if hasattr(msg, "created_at") and msg.created_at
                    else (msg.timestamp.isoformat() if hasattr(msg, "timestamp") and msg.timestamp else None)
                )

                broadcast_data = {
                    "id": msg.id,
                    "item_id": msg.item_id,
                    "sender_id": msg.sender_id,
                    "receiver_id": msg.receiver_id,
                    "message": msg.message,
                    "is_read": getattr(msg, "is_read", False),
                    "timestamp": timestamp_val,
                }

                await manager.send_personal_message(broadcast_data, receiver_id)
                await websocket.send_text(json.dumps(broadcast_data))
            finally:
                db.close()

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


@router.get("/conversations", response_model=list[ConversationOut])
def conversations(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[ConversationOut]:
    time_col = Message.created_at if hasattr(Message, "created_at") else Message.timestamp
    rows = db.scalars(
        select(Message)
        .where((Message.sender_id == user.id) | (Message.receiver_id == user.id))
        .order_by(time_col)
    ).all()

    grouped: dict[str, ConversationOut] = {}
    for msg in rows:
        partner_id = msg.receiver_id if msg.sender_id == user.id else msg.sender_id
        key = f"{msg.item_id}:{partner_id}"
        partner = db.get(User, partner_id)
        item = db.get(Item, msg.item_id)
        entry = grouped.get(key)
        is_read_flag = getattr(msg, "is_read", False)
        unread = 1 if msg.receiver_id == user.id and not is_read_flag else 0
        timestamp_val = getattr(msg, "created_at", getattr(msg, "timestamp", None))

        if entry is None:
            grouped[key] = ConversationOut(
                id=key,
                item_id=msg.item_id,
                item_title=item.title if item else "Removed listing",
                item_image=item.image_path if item else None,
                partner_id=partner_id,
                partner_username=partner.username if partner else "Former member",
                last_message=msg.message,
                last_timestamp=timestamp_val,
                unread=unread,
            )
        else:
            entry.last_message = msg.message
            entry.last_timestamp = timestamp_val
            entry.unread += unread

    return sorted(
        grouped.values(),
        key=lambda c: c.last_timestamp.isoformat() if hasattr(c.last_timestamp, "isoformat") else str(c.last_timestamp),
        reverse=True,
    )


@router.get("/{item_id}/{partner_id}", response_model=list[MessageOut])
def thread(
    item_id: int,
    partner_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Message]:
    time_col = Message.created_at if hasattr(Message, "created_at") else Message.timestamp
    rows = list(
        db.scalars(
            select(Message)
            .where(
                Message.item_id == item_id,
                ((Message.sender_id == user.id) & (Message.receiver_id == partner_id))
                | ((Message.sender_id == partner_id) & (Message.receiver_id == user.id)),
            )
            .order_by(time_col)
        ).all()
    )
    for msg in rows:
        if msg.receiver_id == user.id and hasattr(msg, "is_read"):
            msg.is_read = True
    db.commit()
    return rows


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
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

    timestamp_val = (
        msg.created_at.isoformat()
        if hasattr(msg, "created_at") and msg.created_at
        else (msg.timestamp.isoformat() if hasattr(msg, "timestamp") and msg.timestamp else None)
    )

    broadcast_data = {
        "id": msg.id,
        "item_id": msg.item_id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "message": msg.message,
        "is_read": getattr(msg, "is_read", False),
        "timestamp": timestamp_val,
    }
    await manager.send_personal_message(broadcast_data, payload.receiver_id)
    return msg