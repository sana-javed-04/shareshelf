from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, User
from app.schemas import ItemCreate, ItemOut, ItemUpdate, Paginated
from app.security import bearer_scheme, decode_token, get_current_user
from app.services.distance_service import calculate_distance_km, fuzz_coordinates
from app.routers.users import owner_public

router = APIRouter(prefix="/api/items", tags=["items"])


def serialize(db: Session, item: Item, distance: float | None = None) -> ItemOut:
    out = ItemOut.model_validate(item)
    out.distance_km = distance
    out.owner = owner_public(db, item.owner)
    return out


@router.get("", response_model=Paginated)
def list_items(
    db: Session = Depends(get_db),
    q: str | None = None,
    category: str | None = None,
    listing_type: str | None = None,
    item_condition: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    max_price: float | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = Query(default=None, ge=0.5, le=100),
    owner_id: int | None = None,
    sort: Literal["newest", "price_asc", "price_desc", "distance"] = "newest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
) -> Paginated:
    stmt = select(Item)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(func.lower(Item.title).like(like), func.lower(Item.description).like(like))
        )
    if category:
        stmt = stmt.where(Item.category == category)
    if listing_type:
        stmt = stmt.where(Item.listing_type == listing_type)
    if item_condition:
        stmt = stmt.where(Item.item_condition == item_condition)
    if status_filter:
        stmt = stmt.where(Item.status == status_filter)
    if max_price is not None:
        stmt = stmt.where(Item.price <= max_price)
    if owner_id:
        stmt = stmt.where(Item.owner_id == owner_id)

    items = list(db.scalars(stmt).all())

    rows: list[tuple[Item, float | None]] = []
    for item in items:
        distance = None
        if lat is not None and lng is not None and item.latitude is not None and item.longitude is not None:
            distance = round(calculate_distance_km(lat, lng, item.latitude, item.longitude), 2)
            if radius_km is not None and distance > radius_km:
                continue
        rows.append((item, distance))

    if sort == "price_asc":
        rows.sort(key=lambda r: r[0].price)
    elif sort == "price_desc":
        rows.sort(key=lambda r: -r[0].price)
    elif sort == "distance":
        rows.sort(key=lambda r: (r[1] is None, r[1] or 0))
    else:
        rows.sort(key=lambda r: r[0].created_at, reverse=True)

    total = len(rows)
    start = (page - 1) * page_size
    page_rows = rows[start : start + page_size]
    return Paginated(
        results=[serialize(db, item, distance) for item, distance in page_rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)) -> ItemOut:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That listing is no longer available.")
    return serialize(db, item)


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ItemOut:
    lat, lng = (user.latitude, user.longitude)
    if payload.latitude is not None and payload.longitude is not None:
        lat, lng = fuzz_coordinates(payload.latitude, payload.longitude)
    item = Item(
        owner_id=user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        item_condition=payload.item_condition,
        listing_type=payload.listing_type,
        price=0 if payload.listing_type == "DONATE" else payload.price,
        max_rental_days=payload.max_rental_days if payload.listing_type == "RENT" else None,
        area_name=payload.area_name,
        latitude=lat,
        longitude=lng,
        image_path=payload.image_path,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize(db, item)


@router.put("/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ItemOut:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That listing is no longer available.")
    if item.owner_id != user.id and user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only edit your own listings.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return serialize(db, item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That listing is no longer available.")
    if item.owner_id != user.id and user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only remove your own listings.")
    db.delete(item)
    db.commit()
