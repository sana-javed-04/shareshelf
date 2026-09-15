from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routers import admin, auth, items, messages, reports, transactions

settings = get_settings()

app = FastAPI(
    title="ShareShelf API",
    description="Privacy-preserving hyper-local renting, donating and selling.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(items.router)
app.include_router(transactions.router)
app.include_router(messages.router)
app.include_router(reports.router)
app.include_router(admin.router)

# Import here so the module is registered on the metadata before create_all.
from app.routers import users  # noqa: E402

app.include_router(users.router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
