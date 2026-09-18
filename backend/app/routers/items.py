import os
import shutil
import uuid
from typing import Literal

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Item, User
from app.routers.users import owner_public
from app.schemas import ItemCreate, ItemOut, ItemUpdate, Paginated
from app.security import get_current_user
from app.services.distance_service import calculate_distance_km, fuzz_coordinates

router = APIRouter(prefix="/api/items", tags=["items"])
settings = get_settings()

# Cloudinary Setup (agar env variables mojood hon)
if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def serialize(db: Session, item: Item, distance: float | None = None) -> ItemOut:
    owner_info = owner_public(db, item.owner)
    data = {
        "id": item.id,
        "owner_id": item.owner_id,
        "title": item.title,
        "description": item.description,
        "category": item.category,
        "item_condition": item.item_condition,
        "listing_type": item.listing_type,
        "price": item.price,
        "max_rental_days": item.max_rental_days,
        "latitude": item.latitude,
        "longitude": item.longitude,
        "area_name": item.area_name,
        "image_path": item.image_path,
        "status": item.status,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "distance_km": distance,
        "owner": owner_info,
    }
    return ItemOut(**data)


@router.post("/upload-image", status_code=status.HTTP_201_CREATED)
def upload_item_image(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
) -> dict[str, str]:
    """Uploads an image either to Cloudinary (Production) or local disk (Offline / Dev)."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files (JPEG, PNG, WebP) are allowed.",
        )

    # 1. Cloudinary upload (Production Free Cloud)
    if settings.cloudinary_cloud_name and settings.cloudinary_api_key:
        try:
            result = cloudinary.uploader.upload(
                file.file,
                folder="shareshelf_items",
                resource_type="image",
            )
            return {"image_url": result.get("secure_url", "")}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Image upload failed: {str(e)}",
            )

    # 2. Local Fallback (For offline FYP Viva / Dev testing)
    os.makedirs(settings.upload_dir, exist_ok=True)
    extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    file_name = f"{uuid.uuid4().hex}.{extension}"
    file_path = os.path.join(settings.upload_dir, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"image_url": f"/uploads/{file_name}"}


@router.get("", response_model=Paginated)
def list_items(
    db: Session = Depends(get_db),
    q: str | None = None,
    category: str | None = None,
    listing_type: str | None = None,
    item_condition: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    area: str | None = None,
    max_price: float | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = Query(default=None, ge=0.5, le=100),
    owner_id: int | None = None,
    sort: str = "newest",
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

    # Agar coordinates available NAHI hain sirf tabhi fallback text search karein
    # Kyunki jab lat/lng hote hain toh distance formula automatically aas paas k items le aata hai
    if area and (lat is None or lng is None):
        # Clean query: e.g. "Chak 2/4 L, Okara, Pakistan" -> pick major tokens like "Okara"
        tokens = [t.strip().lower() for t in area.split(",") if len(t.strip()) > 2]
        area_filters = [func.lower(Item.area_name).like(f"%{t}%") for t in tokens]
        if area_filters:
            stmt = stmt.where(or_(*area_filters))

    items = list(db.scalars(stmt).all())

    rows: list[tuple[Item, float | None]] = []
    has_user_coords = lat is not None and lng is not None

    for item in items:
        distance: float | None = None
        if has_user_coords and item.latitude is not None and item.longitude is not None:
            distance = round(calculate_distance_km(lat, lng, item.latitude, item.longitude), 2)
            if radius_km is not None and radius_km > 0:
                if distance > radius_km:
                    continue
        elif radius_km is not None and radius_km > 0:
            continue

        rows.append((item, distance))

    # Sorting
    if sort == "price_asc":
        rows.sort(key=lambda r: r[0].price)
    elif sort == "price_desc":
        rows.sort(key=lambda r: -r[0].price)
    elif sort in ("distance", "nearest"):
        rows.sort(key=lambda r: (r[1] is None, r[1] if r[1] is not None else 999999))
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
    # Priority: 1. Payload Coordinates -> 2. User Coordinates -> 3. Fallback Coordinates
    lat = payload.latitude if payload.latitude is not None else user.latitude
    lng = payload.longitude if payload.longitude is not None else user.longitude

    if lat is not None and lng is not None:
        lat, lng = fuzz_coordinates(lat, lng)

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

    update_data = payload.model_dump(exclude_unset=True)
    if "latitude" in update_data and "longitude" in update_data:
        if update_data["latitude"] is not None and update_data["longitude"] is not None:
            update_data["latitude"], update_data["longitude"] = fuzz_coordinates(
                update_data["latitude"], update_data["longitude"]
            )

    for field, value in update_data.items():
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