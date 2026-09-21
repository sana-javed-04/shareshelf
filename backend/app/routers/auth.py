import os
import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
import resend

from app.database import get_db
from app.models import User
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from app.security import create_access_token, get_current_user, hash_password, verify_password
from app.services.distance_service import fuzz_coordinates

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Resend API Key config (.env se uthayega)
resend.api_key = os.getenv("RESEND_API_KEY", "")


class VerifyOtpRequest(BaseModel):
    email: str
    otp: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


def send_email_otp(email: str, otp: str):
    """Resend API ke zariye real email inbox par 6-digit OTP bhejta hai."""
    try:
        # Agar API key nahi lagi hui to fallback ke taur par console par print ho jayega
        if not resend.api_key or resend.api_key == "":
            print(f"==========================================")
            print(f"WARNING: RESEND_API_KEY missing! OTP for {email}: {otp}")
            print(f"==========================================")
            return

        params = {
            "from": "ShareShelf <onboarding@resend.dev>",
            "to": [email],
            "subject": "Your ShareShelf Verification Code",
            "html": f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0f172a;">Welcome to ShareShelf!</h2>
                <p>Your verification code for secure community exchange is:</p>
                <div style="background: #f1f5f9; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 8px; width: fit-content; margin: 20px 0;">
                    {otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
            </div>
            """,
        }
        resend.Emails.send(params)
    except Exception as e:
        print(f"Failed to send email via Resend: {str(e)}")
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Failed to send verification email. Please check email configuration.",
        )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    existing = db.scalar(
        select(User).where(or_(User.username == payload.username, User.email == payload.email))
    )
    if existing:
        if not existing.is_verified:
            otp = f"{random.randint(100000, 999999)}"
            existing.otp_code = otp
            existing.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
            db.commit()
            send_email_otp(existing.email, otp)
            return {"detail": "Account already exists but not verified. New OTP sent to email."}
        raise HTTPException(status.HTTP_409_CONFLICT, "That username or email is already registered.")

    lat, lng = (None, None)
    if payload.latitude is not None and payload.longitude is not None:
        lat, lng = fuzz_coordinates(payload.latitude, payload.longitude)

    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        area_name=payload.area_name,
        latitude=lat,
        longitude=lng,
        is_verified=False,
        otp_code=otp,
        otp_expires_at=expires_at,
    )
    db.add(user)
    db.commit()

    # Real email send hogi yahan se
    send_email_otp(user.email, otp)

    return {"detail": "Registration successful. Please check your email for the verification OTP."}


@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    if user.is_verified:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Account is already verified.")

    if not user.otp_code or user.otp_code != payload.otp:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OTP code.")

    if user.otp_expires_at and datetime.now(timezone.utc) > user.otp_expires_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP code has expired.")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()
    db.refresh(user)

    return AuthResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Email address not found.")

    otp = f"{random.randint(100000, 999999)}"
    user.otp_code = otp
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.commit()

    send_email_otp(user.email, otp)
    return {"detail": "Password reset OTP has been sent to your email."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    if not user.otp_code or user.otp_code != payload.otp:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OTP code.")

    if user.otp_expires_at and datetime.now(timezone.utc) > user.otp_expires_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP code has expired.")

    user.password_hash = hash_password(payload.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    return {"detail": "Password has been reset successfully. You can now login."}


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(
        select(User).where(or_(User.username == payload.username, User.email == payload.username))
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password.")
    if not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Please verify your email address with OTP before logging in.")
    if user.is_banned:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been suspended by an administrator.")
    return AuthResponse(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/logout")
def logout(_: User = Depends(get_current_user)) -> dict[str, str]:
    """Tokens are stateless; the client discards it. Endpoint exists for symmetry/auditing."""
    return {"detail": "Signed out."}