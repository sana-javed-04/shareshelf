from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Item, Report, Transaction, User
from app.routers.items import serialize
from app.schemas import AdminStats, ItemOut, ReportOut, UserOut
from app.security import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db), _: User = Depends(get_current_admin)) -> AdminStats:
    def count(stmt) -> int:
        return db.scalar(stmt) or 0

    return AdminStats(
        total_users=count(select(func.count(User.id))),
        total_listings=count(select(func.count(Item.id))),
        available_listings=count(select(func.count(Item.id)).where(Item.status == "Available")),
        active_transactions=count(
            select(func.count(Transaction.id)).where(Transaction.status == "Active")
        ),
        completed_transactions=count(
            select(func.count(Transaction.id)).where(Transaction.status == "Completed")
        ),
        pending_reports=count(select(func.count(Report.id)).where(Report.status == "Pending")),
    )


@router.get("/users", response_model=list[UserOut])
def users(db: Session = Depends(get_db), _: User = Depends(get_current_admin)) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at.desc())).all())


@router.post("/users/{user_id}/ban", response_model=UserOut)
def set_ban(
    user_id: int,
    banned: bool = True,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That member does not exist.")
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot suspend your own account.")
    user.is_banned = banned
    db.commit()
    db.refresh(user)
    return user


@router.get("/items", response_model=list[ItemOut])
def all_items(db: Session = Depends(get_db), _: User = Depends(get_current_admin)) -> list[ItemOut]:
    rows = db.scalars(select(Item).order_by(Item.created_at.desc())).all()
    return [serialize(db, item) for item in rows]


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(
    item_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)
) -> None:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That listing is no longer available.")
    db.delete(item)
    db.commit()


@router.get("/reports", response_model=list[ReportOut])
def reports(db: Session = Depends(get_db), _: User = Depends(get_current_admin)) -> list[ReportOut]:
    rows = list(db.scalars(select(Report).order_by(Report.created_at.desc())).all())
    output = []
    for r in rows:
        item_title = None
        if r.reported_item_id:
            item = db.get(Item, r.reported_item_id)
            if item:
                item_title = item.title

        reporter = db.get(User, r.reported_by)
        reporter_username = reporter.username if reporter else f"User #{r.reported_by}"

        reported_username = None
        if r.reported_user_id:
            accused = db.get(User, r.reported_user_id)
            reported_username = accused.username if accused else f"User #{r.reported_user_id}"

        output.append(
            ReportOut(
                id=r.id,
                reported_by=r.reported_by,
                reported_by_username=reporter_username,
                reported_item_id=r.reported_item_id,
                reported_user_id=r.reported_user_id,
                reported_username=reported_username,
                item_title=item_title,
                reason=r.reason,
                description=r.description,
                evidence_image=r.evidence_image,  # <--- Evidence photo yahan pass ho gayi
                status=r.status,
                created_at=r.created_at,
                reviewed_by=r.reviewed_by,
                reviewed_at=r.reviewed_at,
            )
        )
    return output


@router.post("/reports/{report_id}/resolve", response_model=ReportOut)
@router.patch("/reports/{report_id}/resolve", response_model=ReportOut)
@router.post("/reports/{report_id}/review", response_model=ReportOut)
@router.patch("/reports/{report_id}/review", response_model=ReportOut)
def resolve_report(
    report_id: int,
    action: str = "Reviewed",
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> Report:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That report does not exist.")
    if action not in ("Reviewed", "Dismissed"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown moderation action.")
    report.status = "Reviewed"
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)
    return report


@router.post("/reports/{report_id}/dismiss", response_model=ReportOut)
@router.patch("/reports/{report_id}/dismiss", response_model=ReportOut)
def dismiss_report_alias(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> Report:
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That report does not exist.")
    report.status = "Dismissed"
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(report)
    return report