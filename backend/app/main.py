import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv  # <-- Yeh import add karein

# Environment variables load karein .env file se
load_dotenv()  # <-- Yeh line yahan add karna lazmi hai

from app.config import get_settings
from app.database import Base, engine
from app.routers import admin, auth, items, messages, reports, transactions
from app.routers import users
from app.routers import reviews

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure local uploads directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)

    # 2. Automatically create database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="ShareShelf API",
    description="Privacy-preserving hyper-local renting, donating and selling.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for both Localhost and Cloud Frontend (Vercel)
origins = [
    "*",  # Vercel aur kisi bhi public frontend ko allow karne ke liye
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Static Files Mount (For Local Image Access / Fallback)
# -----------------------------------------------------------------------------
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# -----------------------------------------------------------------------------
# API Routers
# -----------------------------------------------------------------------------
app.include_router(auth.router)
app.include_router(items.router)
app.include_router(transactions.router)
app.include_router(messages.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(reviews.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "ShareShelf API is running"}