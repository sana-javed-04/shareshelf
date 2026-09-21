# """Create the schema and dynamic demo data around local coordinates: `python -m app.seed`."""

# import os
# from sqlalchemy import select

# from app.database import Base, SessionLocal, engine
# from app.models import Item, User
# from app.security import hash_password

# # Default base anchor (matches your primary operating area, can be changed via ENV)
# BASE_LAT = float(os.getenv("DEFAULT_LATITUDE", "30.8189"))
# BASE_LNG = float(os.getenv("DEFAULT_LONGITUDE", "73.4320"))
# BASE_AREA = os.getenv("DEFAULT_AREA_NAME", "Okara Cantt / City")

# # Demo listings with realistic kilometer offsets from base:
# # (title, description, category, condition, type, price, days, area_label, lat_offset, lng_offset)
# # Note: 0.01 deg latitude is roughly ~1.11 km
# DEMO_ITEMS = [
#     (
#         "Power drill with bit set",
#         "Cordless 18V drill, barely used. Great for shelves and flat-pack furniture.",
#         "Tools",
#         "Like New",
#         "RENT",
#         150.0,
#         7,
#         "Model Town",
#         0.007,  # ~800 meters away
#         0.005,
#     ),
#     (
#         "Physics textbook bundle",
#         "Three first-year physics textbooks, clean pages, no highlighting.",
#         "Books",
#         "Good",
#         "DONATE",
#         0.0,
#         None,
#         "Campus North",
#         0.022,  # ~2.5 km away
#         -0.015,
#     ),
#     (
#         "Espresso coffee machine",
#         "Reliable machine, descaled monthly. Selling because I moved to filter coffee.",
#         "Home",
#         "Good",
#         "SELL",
#         3500.0,
#         None,
#         "Sadar Bazar",
#         0.055,  # ~6.5 km away
#         0.040,
#     ),
# ]


# def run() -> None:
#     Base.metadata.create_all(bind=engine)
#     db = SessionLocal()
#     try:
#         if db.scalar(select(User).limit(1)):
#             print("Data already present; nothing seeded.")
#             return

#         admin = User(
#             username="admin",
#             email="admin@shareshelf.com",
#             password_hash=hash_password("adminpass123"),
#             role="admin",
#             area_name=f"{BASE_AREA} (HQ)",
#             latitude=round(BASE_LAT, 4),
#             longitude=round(BASE_LNG, 4),
#         )
#         member = User(
#             username="demo",
#             email="demo@shareshelf.com",
#             password_hash=hash_password("demopass123"),
#             area_name=BASE_AREA,
#             latitude=round(BASE_LAT, 4),
#             longitude=round(BASE_LNG, 4),
#         )
#         db.add_all([admin, member])
#         db.flush()

#         for title, desc, cat, cond, ltype, price, days, area, d_lat, d_lng in DEMO_ITEMS:
#             db.add(
#                 Item(
#                     owner_id=member.id,
#                     title=title,
#                     description=desc,
#                     category=cat,
#                     item_condition=cond,
#                     listing_type=ltype,
#                     price=price,
#                     max_rental_days=days,
#                     area_name=f"{area}, {BASE_AREA}",
#                     latitude=round(BASE_LAT + d_lat, 4),
#                     longitude=round(BASE_LNG + d_lng, 4),
#                 )
#             )
#         db.commit()
#         print(f"Seeded demo accounts and listings clustered around {BASE_AREA} ({BASE_LAT}, {BASE_LNG}).")
#     finally:
#         db.close()


# if __name__ == "__main__":
#     run()


import os
from sqlalchemy import select
from sqlalchemy import select, text

from app.database import Base, SessionLocal, engine
from app.models import Item, User, Transaction, Review
from app.security import hash_password

# Default base anchor (Okara, Pakistan)
BASE_LAT = float(os.getenv("DEFAULT_LATITUDE", "30.8189"))
BASE_LNG = float(os.getenv("DEFAULT_LONGITUDE", "73.4320"))
BASE_AREA = os.getenv("DEFAULT_AREA_NAME", "Okara Cantt / City")

DEMO_ITEMS = [
    (
        1,
        2,
        "Physics Textbook Bundle",
        "Three first-year university physics textbooks, clean pages, no highlighting.",
        "Books",
        "Good",
        "DONATE",
        0.0,
        0.0,
        1,
        1,
        None,
        "Campus North, Okara",
        0.0138,
        0.0212,
    ),
    (
        2,
        2,
        "Cordless Electric Drill",
        "18V cordless drill with battery, charger and bit set. Perfect for home DIY.",
        "Tools",
        "Like New",
        "RENT",
        250.0,
        500.0,
        1,
        1,
        7,
        "Model Town, Okara",
        -0.0089,
        0.0180,
    ),
    (
        3,
        2,
        "Sony WH-1000XM4 Headphones",
        "Active noise-cancelling wireless headphones with great battery life.",
        "Electronics",
        "Good",
        "RENT",
        400.0,
        1000.0,
        1,
        1,
        5,
        "Depalpur Road, Okara",
        -0.0039,
        0.0280,
    ),
    (
        4,
        2,
        "Camping Tent (4-Person)",
        "Waterproof 4-person tent, used only twice. Ideal for weekend getaways.",
        "Other",
        "Like New",
        "RENT",
        500.0,
        1500.0,
        1,
        1,
        10,
        "Civil Lines, Okara",
        0.0011,
        0.0080,
    ),
    (
        5,
        2,
        "Professional DSLR Camera",
        "Canon EOS 80D with 18-55mm lens. Great for photography projects.",
        "Electronics",
        "Good",
        "RENT",
        1200.0,
        3000.0,
        1,
        1,
        3,
        "Jinnah Road, Okara",
        -0.0069,
        0.0230,
    ),
    (
        6,
        2,
        "Badminton Racket Set",
        "Two carbon-shaft rackets with shuttlecocks. Barely used.",
        "Other",
        "Like New",
        "SELL",
        1500.0,
        0.0,
        2,
        2,
        None,
        "Stadium Road, Okara",
        -0.0029,
        0.0190,
    ),
]


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Clearing old data and resetting database...")
        db.query(Review).delete()
        db.query(Transaction).delete()
        db.query(Item).delete()
        db.query(User).delete()
        db.commit()

        print("Seeding custom users...")
        admin = User(
            id=1,
            username="sana_dev",
            email="wpress0411@gmail.com",
            password_hash=hash_password("password123"),
            role="admin",
            is_verified=True,
            area_name="Chak 2/4 L, Okara, Pakistan",
            latitude=30.8200,
            longitude=73.4300,
        )
        seller = User(
            id=2,
            username="seller",
            email="seller@gmail.com",
            password_hash=hash_password("password123"),
            role="user",
            is_verified=True,
            area_name="Okara Cantt / City",
            latitude=round(BASE_LAT, 4),
            longitude=round(BASE_LNG, 4),
        )
        buyer = User(
            id=3,
            username="buyer",
            email="buyer@gmail.com",
            password_hash=hash_password("password123"),
            role="user",
            is_verified=True,
            area_name="Johar Town, Lahore",
            latitude=24.8607,
            longitude=67.0011,
        )
        db.add_all([admin, seller, buyer])
        db.commit()

        print("Seeding 6 items linked to seller (ID: 2)...")
        for (
            item_id,
            owner_id,
            title,
            desc,
            cat,
            cond,
            ltype,
            price,
            deposit,
            qty,
            avail_qty,
            days,
            area,
            d_lat,
            d_lng,
        ) in DEMO_ITEMS:
            db.add(
                Item(
                    id=item_id,
                    owner_id=owner_id,
                    title=title,
                    description=desc,
                    category=cat,
                    item_condition=cond,
                    listing_type=ltype,
                    price=price,
                    security_deposit=deposit,
                    quantity=qty,
                    available_quantity=avail_qty,
                    max_rental_days=days,
                    area_name=area,
                    latitude=round(BASE_LAT + d_lat, 4),
                    longitude=round(BASE_LNG + d_lng, 4),
                    status="Available",
                )
            )
        db.commit()

        print("Seeding completed transactions...")
        transactions_data = [
            Transaction(id=1, item_id=1, owner_id=2, borrower_id=3, status="Completed"),
            Transaction(id=2, item_id=2, owner_id=2, borrower_id=3, status="Completed"),
            Transaction(id=3, item_id=3, owner_id=2, borrower_id=3, status="Completed"),
            Transaction(id=4, item_id=6, owner_id=2, borrower_id=3, status="Completed"),
        ]
        db.add_all(transactions_data)
        db.commit()

        print("Seeding reviews...")
        reviews_data = [
            Review(
                id=1,
                item_id=1,
                transaction_id=1,
                reviewer_id=3,
                reviewee_id=2,
                rating=5,
                comment="Bohat hi achi books thin, first-year ke liye best hain! JazakAllah.",
            ),
            Review(
                id=2,
                item_id=2,
                transaction_id=2,
                reviewer_id=3,
                reviewee_id=2,
                rating=4,
                comment="Drill machine ne bohat acha perform kiya, ghar ke kaam aaram se ho gaye.",
            ),
            Review(
                id=3,
                item_id=3,
                transaction_id=3,
                reviewer_id=3,
                reviewee_id=2,
                rating=5,
                comment="Awesome headphones! Active noise cancellation zabardast thi.",
            ),
            Review(
                id=4,
                item_id=6,
                transaction_id=4,
                reviewer_id=3,
                reviewee_id=2,
                rating=5,
                comment="Seller bohat cooperative tha, time par item collect kiya.",
            ),
        ]
        db.add_all(reviews_data)
        db.commit()

        print("Database successfully seeded with users, items, transactions, and reviews!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    run()