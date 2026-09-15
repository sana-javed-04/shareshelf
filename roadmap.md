# ShareShelf roadmap

## Done
- Domain types, API client (real backend or in-browser reference API), services
- Auth + theme contexts, design system, shared components
- Routes: /, /browse, /items/$id, /items/$id/edit, /post-item, /dashboard,
  /my-listings, /my-requests, /transactions, /chat, /profile, /admin,
  /login, /register, /privacy, /terms
- Public member profile route /users/$id (+ demo API endpoint)
- /how-it-works, /safety marketing pages
- 404 catch-all route
- Standalone FastAPI + PostgreSQL backend under /backend

## Verified
- Public pages render (home, browse, how it works, safety, member profile, 404).
- Navigation and footer link to the new pages.
- Standalone FastAPI + PostgreSQL reference backend exists under `backend/`
  (auth, profiles, items with radius search, transactions with hashed pickup PINs,
  messaging, reports, admin moderation, seed script, README).
