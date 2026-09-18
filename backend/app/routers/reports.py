from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, Report, User
from app.schemas import ReportCreate, ReportOut
from app.security import get_current_admin, get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReportOut:
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

    item_title = None
    if report.reported_item_id:
        item = db.get(Item, report.reported_item_id)
        if item:
            item_title = item.title

    return ReportOut(
        id=report.id,
        reported_by=report.reported_by,
        reported_item_id=report.reported_item_id,
        reported_user_id=report.reported_user_id,
        item_title=item_title,
        reason=report.reason,
        description=report.description,
        status=report.status,
        created_at=report.created_at,
        reviewed_by=report.reviewed_by,
        reviewed_at=report.reviewed_at,
    )


@router.get("/my", response_model=list[ReportOut])
def my_reports(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ReportOut]:
    rows = list(
        db.scalars(
            select(Report)
            .where(Report.reported_by == user.id)
            .order_by(Report.created_at.desc())
        ).all()
    )
    output: list[ReportOut] = []
    for r in rows:
        title = None
        if r.reported_item_id:
            item = db.get(Item, r.reported_item_id)
            if item:
                title = item.title
        output.append(
            ReportOut(
                id=r.id,
                reported_by=r.reported_by,
                reported_item_id=r.reported_item_id,
                reported_user_id=r.reported_user_id,
                item_title=title,
                reason=r.reason,
                description=r.description,
                status=r.status,
                created_at=r.created_at,
                reviewed_by=r.reviewed_by,
                reviewed_at=r.reviewed_at,
            )
        )
    return output


@router.post("/{report_id}/dismiss", response_model=ReportOut)
@router.patch("/{report_id}/dismiss", response_model=ReportOut)
def dismiss_report_direct(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ReportOut:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That report does not exist.")
    report.status = "Dismissed"
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)

    item_title = None
    if report.reported_item_id:
        item = db.get(Item, report.reported_item_id)
        if item:
            item_title = item.title

    return ReportOut(
        id=report.id,
        reported_by=report.reported_by,
        reported_item_id=report.reported_item_id,
        reported_user_id=report.reported_user_id,
        item_title=item_title,
        reason=report.reason,
        description=report.description,
        status=report.status,
        created_at=report.created_at,
        reviewed_by=report.reviewed_by,
        reviewed_at=report.reviewed_at,
    )


@router.post("/{report_id}/resolve", response_model=ReportOut)
@router.patch("/{report_id}/resolve", response_model=ReportOut)
@router.post("/{report_id}/review", response_model=ReportOut)
@router.patch("/{report_id}/review", response_model=ReportOut)
def resolve_report_direct(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> ReportOut:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That report does not exist.")
    report.status = "Reviewed"
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)

    item_title = None
    if report.reported_item_id:
        item = db.get(Item, report.reported_item_id)
        if item:
            item_title = item.title

    return ReportOut(
        id=report.id,
        reported_by=report.reported_by,
        reported_item_id=report.reported_item_id,
        reported_user_id=report.reported_user_id,
        item_title=item_title,
        reason=report.reason,
        description=report.description,
        status=report.status,
        created_at=report.created_at,
        reviewed_by=report.reviewed_by,
        reviewed_at=report.reviewed_at,
    )