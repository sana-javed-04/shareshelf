"""Create the schema and dynamic demo data around local coordinates: `python -m app.seed`."""

import os
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Item, User
from app.security import hash_password

# Default base anchor (matches your primary operating area, can be changed via ENV)
BASE_LAT = float(os.getenv("DEFAULT_LATITUDE", "30.8189"))
BASE_LNG = float(os.getenv("DEFAULT_LONGITUDE", "73.4320"))
BASE_AREA = os.getenv("DEFAULT_AREA_NAME", "Okara Cantt / City")

# Demo listings with realistic kilometer offsets from base:
# (title, description, category, condition, type, price, days, area_label, lat_offset, lng_offset)
# Note: 0.01 deg latitude is roughly ~1.11 km
DEMO_ITEMS = [
    (
        "Power drill with bit set",
        "Cordless 18V drill, barely used. Great for shelves and flat-pack furniture.",
        "Tools",
        "Like New",
        "RENT",
        150.0,
        7,
        "Model Town",
        0.007,  # ~800 meters away
        0.005,
    ),
    (
        "Physics textbook bundle",
        "Three first-year physics textbooks, clean pages, no highlighting.",
        "Books",
        "Good",
        "DONATE",
        0.0,
        None,
        "Campus North",
        0.022,  # ~2.5 km away
        -0.015,
    ),
    (
        "Espresso coffee machine",
        "Reliable machine, descaled monthly. Selling because I moved to filter coffee.",
        "Home",
        "Good",
        "SELL",
        3500.0,
        None,
        "Sadar Bazar",
        0.055,  # ~6.5 km away
        0.040,
    ),
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
            area_name=f"{BASE_AREA} (HQ)",
            latitude=round(BASE_LAT, 4),
            longitude=round(BASE_LNG, 4),
        )
        member = User(
            username="demo",
            email="demo@shareshelf.com",
            password_hash=hash_password("demopass123"),
            area_name=BASE_AREA,
            latitude=round(BASE_LAT, 4),
            longitude=round(BASE_LNG, 4),
        )
        db.add_all([admin, member])
        db.flush()

        for title, desc, cat, cond, ltype, price, days, area, d_lat, d_lng in DEMO_ITEMS:
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
                    area_name=f"{area}, {BASE_AREA}",
                    latitude=round(BASE_LAT + d_lat, 4),
                    longitude=round(BASE_LNG + d_lng, 4),
                )
            )
        db.commit()
        print(f"Seeded demo accounts and listings clustered around {BASE_AREA} ({BASE_LAT}, {BASE_LNG}).")
    finally:
        db.close()


if __name__ == "__main__":
    run()