"""Create the schema and a small set of demo data: `python -m app.seed`."""

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Item, User
from app.security import hash_password

DEMO_ITEMS = [
    ("Power drill with bit set", "Cordless 18V drill, barely used. Great for shelves and flat-pack furniture.", "Tools", "Like New", "RENT", 4.0, 7, "Maple Ward"),
    ("Physics textbook bundle", "Three first-year physics textbooks, clean pages, no highlighting.", "Books", "Good", "DONATE", 0.0, None, "Campus North"),
    ("Espresso machine", "Reliable machine, descaled monthly. Selling because I moved to filter coffee.", "Home", "Good", "SELL", 65.0, None, "Riverside"),
]


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(User).limit(1)):
            print("Data already present; nothing seeded.")
            return

        admin = User(
            username="admin",
            email="admin@shareshelf.com",
            password_hash=hash_password("adminpass123"),
            role="admin",
            area_name="Riverside",
            latitude=51.51,
            longitude=-0.12,
        )
        member = User(
            username="demo",
            email="demo@shareshelf.com",
            password_hash=hash_password("demopass123"),
            area_name="Maple Ward",
            latitude=51.52,
            longitude=-0.11,
        )
        db.add_all([admin, member])
        db.flush()

        for title, desc, cat, cond, ltype, price, days, area in DEMO_ITEMS:
            db.add(
                Item(
                    owner_id=member.id,
                    title=title,
                    description=desc,
                    category=cat,
                    item_condition=cond,
                    listing_type=ltype,
                    price=price,
                    max_rental_days=days,
                    area_name=area,
                    latitude=51.52,
                    longitude=-0.11,
                )
            )
        db.commit()
        print("Seeded admin/demo accounts and sample listings.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
