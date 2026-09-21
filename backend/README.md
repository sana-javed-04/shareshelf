# ShareShelf API (FastAPI + PostgreSQL)

Reference backend for the ShareShelf frontend. The frontend ships with a built-in
demo backend, so this service is optional — point the app at it by setting
`VITE_API_BASE_URL=http://localhost:8000/api`.

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # then edit DATABASE_URL and SECRET_KEY
python -m app.seed      # creates tables + demo accounts
uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

Demo accounts created by the seed script: `admin` / `adminpass123` (moderator)
and `demo` / `demopass123`.

## Privacy model

- Coordinates are coarsened to a ~1 km grid (`fuzz_coordinates`) before they are
  stored, so exact addresses never enter the database.
- Public member and listing payloads expose only username, approximate area,
  join date and exchange counts — never email or precise location.
- Distances are computed with the Haversine formula from coarsened points.
- Pickup PINs are stored as bcrypt hashes; the plaintext is returned once, at
  approval time.

## Endpoints

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/register`, `/login`, `/logout` |
| Profile | `GET/PUT /api/users/me`, `GET /api/users/me/stats`, `GET /api/users/{id}` |
| Items | `GET /api/items` (search, filters, radius, sort, pagination), `GET/POST/PUT/DELETE /api/items/{id}` |
| Transactions | `GET /api/transactions`, `POST /api/transactions/request`, `/{id}/approve`, `/reject`, `/verify-pin`, `/return`, `/cancel` |
| Messages | `GET /api/messages/conversations`, `GET /api/messages/{item_id}/{partner_id}`, `POST /api/messages` |
| Reports | `POST /api/reports` |
| Admin | `GET /api/admin/stats`, `/users`, `/items`, `/reports`, `POST /api/admin/users/{id}/ban`, `/reports/{id}/resolve`, `DELETE /api/admin/items/{id}` |
