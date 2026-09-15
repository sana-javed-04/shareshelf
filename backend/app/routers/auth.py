from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from app.security import create_access_token, get_current_user, hash_password, verify_password
from app.services.distance_service import fuzz_coordinates

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing = db.scalar(
        select(User).where(or_(User.username == payload.username, User.email == payload.email))
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "That username or email is already registered.")

    lat, lng = (None, None)
    if payload.latitude is not None and payload.longitude is not None:
        lat, lng = fuzz_coordinates(payload.latitude, payload.longitude)

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        area_name=payload.area_name,
        latitude=lat,
        longitude=lng,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(
        select(User).where(or_(User.username == payload.username, User.email == payload.username))
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password.")
    if user.is_banned:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been suspended by an administrator.")
    return AuthResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/logout")
def logout(_: User = Depends(get_current_user)) -> dict[str, str]:
    """Tokens are stateless; the client discards it. Endpoint exists for symmetry/auditing."""
    return {"detail": "Signed out."}
