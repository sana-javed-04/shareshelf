from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, Report, User
from app.schemas import ReportCreate, ReportOut
from app.security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Report:
    if payload.reported_item_id is None and payload.reported_user_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tell us what you are reporting.")
    if payload.reported_item_id is not None and db.get(Item, payload.reported_item_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That listing is no longer available.")
    if payload.reported_user_id is not None and db.get(User, payload.reported_user_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That member does not exist.")

    existing = db.scalar(
        select(Report).where(
            Report.reported_by == user.id,
            Report.reported_item_id == payload.reported_item_id,
            Report.reported_user_id == payload.reported_user_id,
        )
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already reported this.")

    report = Report(
        reported_by=user.id,
        reported_item_id=payload.reported_item_id,
        reported_user_id=payload.reported_user_id,
        reason=payload.reason,
        description=payload.description,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
