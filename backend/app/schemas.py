from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ListingType = Literal["RENT", "DONATE", "SELL"]
Category = Literal["Books", "Electronics", "Tools", "Fashion", "Home", "Other"]
Condition = Literal["Brand New", "Like New", "Good", "Fair"]
ItemStatus = Literal["Available", "Reserved", "Rented", "Sold"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    area_name: str = Field(min_length=2, max_length=120)
    latitude: float | None = None
    longitude: float | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(ORMModel):
    id: int
    username: str
    email: str
    role: str
    is_banned: bool
    latitude: float | None
    longitude: float | None
    area_name: str | None
    total_transactions: int
    created_at: datetime
    updated_at: datetime


class OwnerPublic(BaseModel):
    """Never contains email or exact coordinates."""

    id: int
    username: str
    area_name: str | None
    created_at: datetime
    total_transactions: int
    active_listings: int


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=30)
    area_name: str | None = Field(default=None, max_length=120)
    latitude: float | None = None
    longitude: float | None = None


class ItemCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=10, max_length=2000)
    category: Category
    item_condition: Condition
    listing_type: ListingType
    price: float = Field(ge=0)
    max_rental_days: int | None = Field(default=None, ge=1, le=365)
    area_name: str = Field(min_length=2, max_length=120)
    latitude: float | None = None
    longitude: float | None = None
    image_path: str | None = None


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=120)
    description: str | None = Field(default=None, min_length=10, max_length=2000)
    category: Category | None = None
    item_condition: Condition | None = None
    listing_type: ListingType | None = None
    price: float | None = Field(default=None, ge=0)
    max_rental_days: int | None = None
    area_name: str | None = None
    status: ItemStatus | None = None
    image_path: str | None = None


class ItemOut(ORMModel):
    id: int
    owner_id: int
    title: str
    description: str
    category: str
    item_condition: str
    listing_type: str
    price: float
    max_rental_days: int | None
    latitude: float | None
    longitude: float | None
    area_name: str
    image_path: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    distance_km: float | None = None
    owner: OwnerPublic | None = None


class Paginated(BaseModel):
    results: list[ItemOut]
    total: int
    page: int
    page_size: int


class TransactionOut(ORMModel):
    id: int
    item_id: int
    borrower_id: int
    owner_id: int
    pin_verified: bool
    status: str
    start_date: datetime | None
    due_date: datetime | None
    return_date: datetime | None
    created_at: datetime
    updated_at: datetime
    item: ItemOut | None = None
    owner_username: str | None = None
    borrower_username: str | None = None
    pickup_pin: str | None = None


class TransactionRequest(BaseModel):
    item_id: int


class PinRequest(BaseModel):
    pin: str = Field(min_length=4, max_length=8)


class MessageCreate(BaseModel):
    item_id: int
    receiver_id: int
    message: str = Field(min_length=1, max_length=1000)


class MessageOut(ORMModel):
    id: int
    item_id: int
    sender_id: int
    receiver_id: int
    message: str
    is_read: bool
    timestamp: datetime


class ConversationOut(BaseModel):
    id: str
    item_id: int
    item_title: str
    item_image: str | None
    partner_id: int
    partner_username: str
    last_message: str
    last_timestamp: datetime
    unread: int


class ReportCreate(BaseModel):
    reason: str = Field(max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    reported_item_id: int | None = None
    reported_user_id: int | None = None


class ReportOut(BaseModel):
    id: int
    reported_by: int
    reported_item_id: int | None = None
    reported_user_id: int | None = None
    item_title: str | None = None  
    reason: str
    description: str | None = None
    status: str
    created_at: datetime
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class DashboardStats(BaseModel):
    active_listings: int
    pending_requests: int
    active_transactions: int
    completed_transactions: int
    unread_messages: int
    total_listings: int


class AdminStats(BaseModel):
    total_users: int
    total_listings: int
    available_listings: int
    active_transactions: int
    completed_transactions: int
    pending_reports: int
