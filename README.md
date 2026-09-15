ShareShelf

ShareShelf is a privacy-preserving, hyper-local platform for renting, donating, and selling second-hand items within local communities, residential areas, university campuses, towns, and cities.

The platform helps people discover nearby resources, communicate through private in-app chat without exposing phone numbers, and complete physical handovers using a temporary 4-digit verification PIN.

Repository Details

Recommended Repository Name

Plain Text

shareshelf

Alternative names:

Plain Text

shareshelf-hyperlocal-marketplace
shareshelf-fyp
shareshelf-community-sharing-platform

Short Description

Plain Text

A privacy-preserving hyper-local platform for renting, donating, and selling items nearby.

Long Description

Plain Text

ShareShelf is a full-stack community sharing platform that enables users to rent, donate, and sell second-hand items within nearby areas. It includes radius-based discovery using Leaflet, OpenStreetMap, and the Haversine formula; private in-app WebSocket chat; JWT authentication; item lifecycle management; 4-digit handover PIN verification; transaction tracking; reporting; and an administrator moderation panel.

Suggested GitHub Topics

Plain Text

shareshelf
final-year-project
fyp
fastapi
react
postgresql
neon-tech
sqlalchemy
websocket
leaflet
openstreetmap
hyperlocal-marketplace
community-sharing
circular-economy
second-hand-marketplace

Technology Stack

Layer
Technology
Purpose
Frontend
React.js, TypeScript, Tailwind CSS
Responsive and maintainable user interface
Frontend routing
React Router
Page navigation and protected routes
Animation
Framer Motion
Lightweight page transitions and micro-interactions
Backend
Python FastAPI
REST APIs, authentication, transactions, and WebSockets
ORM
SQLAlchemy
Connects Python models with PostgreSQL tables
Database
PostgreSQL via Neon.tech
Stores users, listings, transactions, messages, and reports
Authentication
JWT and bcrypt/Passlib
Secure login and protected access
Real-time chat
Native FastAPI WebSockets
Private in-app messaging
Maps
Leaflet.js and OpenStreetMap
Nearby item discovery and map markers
Distance calculation
Haversine formula
Radius-based search in kilometers
Migrations
Alembic
Database schema versioning
Image handling
FastAPI uploads directory
Item image uploads and storage

Core Features

ShareShelf supports three listing modes: Rent, Donate, and Sell. Users can create listings with a title, description, category, condition, price, approximate location, and image.

The platform provides discovery filters for listing type, category, condition, area, price, and distance. Users can search for items within 1 km, 5 km, 10 km, or 20 km using Leaflet, OpenStreetMap, and a backend Haversine distance calculation.

Users can communicate privately through item-based WebSocket chat without sharing phone numbers. Owners can approve or reject requests, and approved transactions use a temporary 4-digit handover PIN. Rental items move through the states Available → Reserved → Rented → Returned → Available, while sold or donated items become unavailable after completion.

Administrators can review reports, manage users, ban or unban accounts, moderate listings, and monitor transaction activity.

Main User Workflow

Plain Text

Register
→ Login
→ Create or browse a listing
→ Search by category, condition, area, or radius
→ View item details
→ Chat privately
→ Request an item
→ Owner approves or rejects
→ System generates a temporary PIN
→ Owner verifies the PIN at handover
→ Item becomes Rented, Sold, or Completed
→ Rental item is returned
→ Owner confirms return
→ Item becomes Available again

Project Structure

Plain Text

shareshelf/
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── layouts/
│ │ ├── context/
│ │ ├── hooks/
│ │ ├── services/
│ │ │ ├── apiClient.ts
│ │ │ ├── authService.ts
│ │ │ ├── itemService.ts
│ │ │ ├── transactionService.ts
│ │ │ ├── chatService.ts
│ │ │ └── reportService.ts
│ │ ├── types/
│ │ ├── utils/
│ │ ├── App.tsx
│ │ └── main.tsx
│ ├── public/
│ ├── .env.example
│ └── package.json
│
├── backend/
│ ├── app/
│ │ ├── main.py
│ │ ├── config.py
│ │ ├── database.py
│ │ ├── models.py
│ │ ├── schemas.py
│ │ ├── dependencies.py
│ │ ├── security.py
│ │ ├── routers/
│ │ │ ├── auth.py
│ │ │ ├── users.py
│ │ │ ├── items.py
│ │ │ ├── transactions.py
│ │ │ ├── chat.py
│ │ │ ├── reports.py
│ │ │ └── admin.py
│ │ ├── services/
│ │ │ ├── distance_service.py
│ │ │ ├── pin_service.py
│ │ │ ├── transaction_service.py
│ │ │ ├── websocket_manager.py
│ │ │ └── image_service.py
│ │ ├── utils/
│ │ └── uploads/
│ ├── alembic/
│ ├── alembic.ini
│ ├── requirements.txt
│ ├── .env.example
│ └── README.md
│
├── docs/
├── .gitignore
└── README.md

Database Tables

The main database tables are:

Table
Purpose
users
User accounts, roles, approximate location, and transaction statistics
items
Rent, donate, and sell listings
transactions
Requests, approvals, PIN verification, rentals, sales, and returns
chat_messages
Private item-based conversations
reports
User and listing reports for administrator review

API Endpoints

Authentication

Plain Text

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/users/me
PUT /api/users/me

Listings

Plain Text

GET /api/items
POST /api/items
GET /api/items/{item_id}
PUT /api/items/{item_id}
DELETE /api/items/{item_id}
GET /api/items/search
POST /api/items/{item_id}/image

Transactions

Plain Text

POST /api/transactions/request
GET /api/transactions/my
GET /api/transactions/incoming
PATCH /api/transactions/{transaction_id}/approve
PATCH /api/transactions/{transaction_id}/reject
POST /api/transactions/{transaction_id}/verify-pin
POST /api/transactions/{transaction_id}/return
POST /api/transactions/{transaction_id}/cancel

Chat

Plain Text

GET /api/messages/{item_id}
POST /api/messages
PATCH /api/messages/{message_id}/read
WS /ws/chat/{item_id}

Reports and administration

Plain Text

POST /api/reports
GET /api/admin/users
PATCH /api/admin/users/{user_id}/ban
PATCH /api/admin/users/{user_id}/unban
GET /api/admin/items
DELETE /api/admin/items/{item_id}
GET /api/admin/reports
PATCH /api/admin/reports/{report_id}/review
PATCH /api/admin/reports/{report_id}/dismiss
GET /api/admin/transactions

Environment Variables

Backend .env

Plain Text

DATABASE_URL=postgresql+psycopg://USERNAME:PASSWORD@NEON_HOST/DATABASE?sslmode=require
JWT_SECRET_KEY=replace_with_a_long_random_secret
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:5173
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=5

Frontend .env

Plain Text

VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000

Never commit real passwords, database URLs, JWT secrets, or private keys. Keep .env files in .gitignore and commit only .env.example files.

Local Setup

Prerequisites

Install the following before running the project:

•
Node.js 18 or newer

•
Python 3.10 or newer

•
Git

•
A Neon.tech PostgreSQL project

Backend Setup

Bash

cd backend
python -m venv .venv

Activate the virtual environment on Windows:

Bash

.venv\Scripts\activate

Activate it on macOS or Linux:

Bash

source .venv/bin/activate

Install backend dependencies:

Bash

pip install -r requirements.txt

Copy .env.example to .env and add the Neon PostgreSQL connection string and JWT secret.

Run database migrations:

Bash

alembic upgrade head

Start the FastAPI server:

Bash

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

The API documentation will be available at:

Plain Text

http://127.0.0.1:8000/docs

Frontend Setup

Open a second terminal:

Bash

cd frontend
npm install
npm run dev

The frontend will normally be available at:

Plain Text

http://localhost:5173

Make sure VITE_API_BASE_URL and VITE_WS_BASE_URL point to the running FastAPI backend.

Security Notes

ShareShelf does not request or display phone numbers. Exact private addresses should not be exposed; listings should use approximate locations or area names.

Passwords must be stored only as secure hashes. The frontend must never receive database credentials or the JWT secret. Transaction state changes, PIN verification, ownership checks, admin permissions, and WebSocket access must be validated by the backend.

The pickup PIN should be generated securely, stored as a hash where possible, invalidated after successful verification, and never reused.

Testing Checklist

The following complete workflow should be tested before the final demonstration:

Plain Text

Register
→ Login
→ Create listing
→ Upload image
→ Browse listings
→ Search and filter
→ Test map and radius search
→ Open item details
→ Send private message
→ Request item
→ Owner approves request
→ Generate PIN
→ Test incorrect PIN
→ Verify correct PIN
→ Change item status
→ Confirm rental return
→ Make item available again
→ Submit report
→ Review report as admin

Also test duplicate accounts, invalid passwords, unauthorized listing edits, unavailable item requests, unauthorized chat access, normal-user access to admin routes, mobile layout, dark mode, image validation, and network errors.

Development Roadmap

Phase
Deliverables
Phase 1
Project setup, Neon connection, SQLAlchemy models, and Alembic migrations
Phase 2
Registration, login, JWT authentication, and role-based permissions
Phase 3
Listing creation, editing, deletion, image upload, and item status
Phase 4
Browse page, filters, Leaflet map, OpenStreetMap, and Haversine search
Phase 5
Transaction requests, approval/rejection, and status lifecycle
Phase 6
4-digit PIN generation, verification, and rental return
Phase 7
Native FastAPI WebSocket chat and message persistence
Phase 8
Reports, moderation, admin dashboard, and user management
Phase 9
Responsive UI, light/dark theme, animations, SEO, and accessibility
Phase 10
Integration testing, documentation, deployment, and final presentation

Academic Project Context

ShareShelf is designed as a Final Year Project demonstrating full-stack development, REST API design, relational database modeling, authentication, WebSocket communication, geospatial distance calculation, workflow/state management, moderation, responsive design, and privacy-aware community technology.

License

This project is intended for academic and educational use. Add an appropriate license before public release.

Author

Developed as a Final Year Project for the ShareShelf community resource-sharing platform.
