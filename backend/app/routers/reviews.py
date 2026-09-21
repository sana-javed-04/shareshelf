from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Review, Transaction, User
from app.schemas import ReviewCreate
from app.security import get_current_user

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tx = db.get(Transaction, payload.transaction_id)
    if tx is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found.")

    if user.id not in (tx.owner_id, tx.borrower_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only participants of this exchange can leave a review."
        )

    if tx.status not in ("Completed", "Cancelled", "Disputed"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Reviews can only be submitted for completed or ended exchanges."
        )

    # Determine who is reviewing whom
    reviewee_id = tx.borrower_id if user.id == tx.owner_id else tx.owner_id

    # Sirf is specific transaction_id ka check karein taaki har nayi transaction par review allow ho
    existing = db.scalar(
        select(Review).where(
            Review.transaction_id == tx.id,
            Review.reviewer_id == user.id,
        )
    )

    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "You have already submitted a review for this specific exchange."
        )

    review = Review(
        item_id=tx.item_id,
        transaction_id=tx.id,
        reviewer_id=user.id,
        reviewee_id=reviewee_id,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return {"message": "Review submitted successfully", "id": review.id}


@router.get("/user/{user_id}")
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    reviews = db.scalars(
        select(Review).where(Review.reviewee_id == user_id).order_by(Review.created_at.desc())
    ).all()
    return [
        {
            "id": r.id,
            "item_id": r.item_id,
            "reviewer_id": r.reviewer_id,
            "rating": r.rating,
            "comment": r.comment,
            "reviewer_username": r.reviewer.username if r.reviewer else "Anonymous",
            "created_at": r.created_at,
        }
        for r in reviews
    ]
from app.models import Review, Transaction, User, Item

@router.get("/item/{item_id}")
def get_item_reviews(item_id: int, db: Session = Depends(get_db)):
    # Sirf wo reviews fetch karein jo buyer/borrower ne item ke liye diye hain
    reviews = db.scalars(
        select(Review)
        .join(Transaction, Review.transaction_id == Transaction.id)
        .where(
            Review.item_id == item_id,
            Review.reviewer_id == Transaction.borrower_id
        )
        .order_by(Review.created_at.desc())
    ).all()
    
    return [
        {
            "id": r.id,
            "item_id": r.item_id,
            "reviewer_id": r.reviewer_id,
            "rating": r.rating,
            "comment": r.comment,
            "reviewer_username": r.reviewer.username if r.reviewer else "Anonymous",
            "created_at": r.created_at,
        }
        for r in reviews
    ]