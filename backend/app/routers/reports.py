from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, Report, User
from app.schemas import ReportCreate, ReportOut
from app.security import get_current_admin, get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


def build_report_out(db: Session, report: Report) -> ReportOut:
    """Helper function to enrich report with usernames, item title, and photo."""
    item_title = None
    if report.reported_item_id:
        item = db.get(Item, report.reported_item_id)
        if item:
            item_title = item.title

    reporter = db.get(User, report.reported_by)
    reporter_username = reporter.username if reporter else f"User #{report.reported_by}"

    reported_username = None
    if report.reported_user_id:
        accused = db.get(User, report.reported_user_id)
        if accused:
            reported_username = accused.username
        else:
            reported_username = f"User #{report.reported_user_id}"

    return ReportOut(
        id=report.id,
        reported_by=report.reported_by,
        reported_by_username=reporter_username,
        reported_item_id=report.reported_item_id,
        reported_user_id=report.reported_user_id,
        reported_username=reported_username,
        item_title=item_title,
        reason=report.reason,
        description=report.description,
        evidence_image=report.evidence_image,  # <--- Evidence photo return karega
        status=report.status,
        created_at=report.created_at,
        reviewed_by=report.reviewed_by,
        reviewed_at=report.reviewed_at,
    )


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

    # Duplicate check: agar usi item/user par pending report hai to nayi details aur photo update karein
    existing = db.scalar(
        select(Report).where(
            Report.reported_by == user.id,
            Report.reported_item_id == payload.reported_item_id,
            Report.reported_user_id == payload.reported_user_id,
            Report.status == "Pending",
        )
    )

    if existing:
        existing.reason = payload.reason
        existing.description = payload.description
        if payload.evidence_image:
            existing.evidence_image = payload.evidence_image
        db.commit()
        db.refresh(existing)
        report = existing
    else:
        report = Report(
            reported_by=user.id,
            reported_item_id=payload.reported_item_id,
            reported_user_id=payload.reported_user_id,
            reason=payload.reason,
            description=payload.description,
            evidence_image=payload.evidence_image,
            status="Pending",
        )
        db.add(report)
        db.commit()
        db.refresh(report)

    return build_report_out(db, report)


@router.get("", response_model=list[ReportOut])
def list_reports_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> list[ReportOut]:
    """Admin endpoint to fetch all platform reports with evidence photos."""
    reports = list(
        db.scalars(
            select(Report).order_by(Report.created_at.desc())
        ).all()
    )
    return [build_report_out(db, r) for r in reports]


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
    return [build_report_out(db, r) for r in rows]


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
    return build_report_out(db, report)


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
    return build_report_out(db, report)