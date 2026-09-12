# SI-JADWAL LUAR PUSKESMAS (melati-schedule)

## Overview
Internal web app for scheduling puskesmas field activities. Dashboard of employee presence per room, conflict-blocking scheduler, Excel/PDF/Word import, one-step approval, and monthly calendar.

- Source: https://github.com/tiofansha-bit/melati-schedule (branch `main`), imported into `/app`.
- Type: Web app (not mobile). No third-party integrations. Seed data auto-created on startup.

## Tech Stack
- Frontend: React 19 + CRACO + Tailwind + shadcn/ui (`/app/frontend`), yarn.
- Backend: FastAPI + Motor (`/app/backend/server.py`), entry module `server:app`.
- Database: MongoDB (local, via `MONGO_URL`).

## Env keys
- backend/.env: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`
- frontend/.env: `REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT`, `ENABLE_HEALTH_CHECK`
- No `.env.example` in repo; keys reconstructed from `server.py` and environment defaults.

## Setup done (2026-06)
- Cloned repo; copied `backend/` + `frontend/` into `/app` preserving existing `.env` files.
- Backend deps: installed app-used packages (python-docx, pdfplumber, openpyxl, reportlab, xlrd, pytest-xdist). NOTE: `requirements.txt` pins `emergentintegrations`/`litellm` which have a resolver conflict and are unused by the app — installed only what the app imports.
- Copied `tests/fixtures` (pegawai.xlsx, jadwal.docx, jadwal.pdf) required by pytest.
- Services managed by supervisor (backend :8001, frontend :3000). Both running.

## Verification (all passing)
- `pytest tests/backend_test.py` → 13 passed.
- Seed data: 13 rooms, 16 employees, 3 schedules.
- Dashboard, Kalender, Jadwal import dialog (+ template download) render correctly.
- Double-date conflict on create returns HTTP 409.

## Core features (existing)
- Dashboard keluar-masuk pegawai per ruangan (`/api/dashboard`)
- Pegawai CRUD + bulk/import parse (`/api/pegawai*`)
- Jadwal CRUD, conflict check/block, bulk/import parse (`/api/jadwal*`)
- Approval (Kepala TU / Kepala Puskesmas) (`/api/jadwal/{id}/approval`)
- Monthly calendar with status colors

## Backlog (author's, NOT part of this import)
- Per-room calendar filter
- Report export

## Notes
- Scope of this task was import + install + run only. No feature changes made.
