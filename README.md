# ShareShelf 🚀

**ShareShelf** is a privacy-preserving, hyper-local platform designed for renting, donating, and selling second-hand items within local communities, residential areas, university campuses, towns, and cities.

The platform allows users to discover nearby listings, communicate through private in-app messaging without exposing phone numbers, request items, and securely complete physical handovers using a temporary 4-digit pickup PIN.

---

## 🌟 Key Features

- **Item Transactions:** Rent, donate, or sell second-hand items seamlessly.
- **Advanced Discovery:** Browse listings with robust search, filters, sorting, pagination, and radius-based location discovery.
- **Dynamic Filters:** Filter items by listing type, category, condition, area, price, and precise distance.
- **Geospatial Proximity:** Built-in maps using Leaflet and OpenStreetMap, calculating nearby listings via the Haversine formula.
- **Privacy-First Messaging:** Secure, item-based private messaging without exposing users' physical contact numbers or email addresses.
- **Secure Handovers:** Temporary 4-digit pickup PIN generation and verification at the time of physical item handover.
- **State Management:** Lifecycle tracking for rentals, sales, donations, returns, and cancellations.
- **Admin Moderation:** Dedicated admin dashboard to manage users, items, flags, reports, and ongoing transactions.
- **Theme Support:** Fully responsive interface supporting Light, Dark, and System theme synchronization.

---

## 🛠️ Technology Stack

### Frontend

- **Framework:** React 19 & TypeScript
- **Runtime & Build Tool:** Vite with TanStack Start configuration
- **Routing:** TanStack Router (Type-safe routing)
- **Data Fetching:** TanStack Query (React Query)
- **Styling & Components:** Tailwind CSS v4, Radix UI primitives
- **Animations:** Motion (Framer Motion)
- **Maps:** Leaflet.js & OpenStreetMap
- **Forms:** React Hook Form & Zod validation

### Backend (Optional Standalone)

- **Framework:** Python FastAPI (RESTful APIs)
- **Database ORM:** SQLAlchemy with PostgreSQL
- **Migrations:** Alembic
- **Authentication:** JWT (JSON Web Tokens) with `python-jose` and `passlib/bcrypt`
- **Server:** Uvicorn

---

## 📂 Project Structure

```text
shareshelf/
├── src/                    # React/TanStack Frontend
│   ├── components/         # Shared & UI Design System components
│   ├── routes/             # TanStack Router pages & layout files
│   ├── contexts/           # Auth and Theme contexts
│   ├── lib/                # API Client & Mock/Demo API layer
│   ├── data/               # Local reference data
│   ├── types/              # Global TypeScript declarations
│   └── styles/             # Global CSS & Tailwind configuration
├── public/                 # Static assets & web configuration
├── backend/                # Optional Standalone FastAPI Service
│   ├── app/                # Main application code (routers, schemas, models)
│   ├── requirements.txt    # Python backend dependencies
│   └── .env.example        # Backend environment variables
└── README.md
```

---

## 🚀 Getting Started

### 1. Running the Frontend (Demo Mode)

The frontend includes a built-in in-browser reference API layer, allowing you to run, explore, and test the layout instantly without spinning up a live backend server.

**Prerequisites:** Node.js (v18+ recommended) and npm or Bun.

```bash
# Install package dependencies
npm install

# Start the local development server
npm run dev
```

Open your browser and navigate to the address displayed in your terminal (usually `http://localhost:8080` or `http://localhost:5173`).

---

### 2. Running the FastAPI Backend

To connect the frontend to a real persistent database ecosystem:

```bash
# Navigate to backend directory
cd backend

# Create and activate a python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install required dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env  # Update your local DATABASE_URL here

# Seed database with initial demo data/admin accounts
python -m app.seed

# Start up the development server
uvicorn app.main:app --reload --port 8000
```

- Interactive Swagger API docs will be active at: `http://localhost:8000/docs`
- **Frontend Linkage:** Add `VITE_API_BASE_URL=http://localhost:8000/api` to your frontend variables and restart the web server.

---

## 🔒 Privacy & Safety Model

- **Coordinates Masking:** Exact locations are coarsened into an approximate 1 km grid sector utilizing custom fuzz calculations before saving.
- **Data Isolation:** Critical contact entries like telephone fields or precise home coordinates are completely excluded from public endpoints.
- **PIN Hashing:** Handover pickup verification pins are stored strictly using secure one-way bcrypt hashes.

---

## 🎓 Academic Context

**ShareShelf** was developed by **Sana Javed** as a Final Year Project demonstrating full-stack engineering architecture, safe relational data modeling, custom state tracking lifecycles, and a privacy-centric application approach.
