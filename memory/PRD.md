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
- Scope of the initial task was import + install + run only.

## Updates (2026-06) — post-import enhancements
- **Requirements cleanup**: replaced bloated `requirements.txt` (which pinned conflicting `emergentintegrations`/`litellm`) with a lean, pinned list of only packages the app imports. `pip install -r requirements.txt` now succeeds cleanly.
- **Report export**: new backend endpoints `GET /api/jadwal/export/excel` and `GET /api/jadwal/export/pdf` (params `year`, `month`) generate a styled monthly schedule (openpyxl for XLSX, reportlab for PDF). "Ekspor Excel"/"Ekspor PDF" buttons added to the Kalender page header (export the currently viewed month).
- **Conflict preview**: `find_conflicts` now returns the clashing activity's `status`; the Jadwal form conflict banner now shows each clashing activity as a card (name, status badge, date range, location, affected employees) plus a "change date / remove employee" hint.
- Verified: pytest 13/13 pass; exports return valid XLSX/PDF with correct headers; conflict UI renders and blocks submit.

## Update (2026-06) — Koordinator field + perfected jadwal import
- **Koordinator Program (Pengisi)** field added to the add/edit schedule form, stored on each schedule, shown on cards, and included in Excel/PDF exports and the import flow.
- **Import template perfected** (`GET /api/jadwal/template`, dynamic): headers `Nama Kegiatan, Tanggal Mulai, Tanggal Selesai, Lokasi, Pegawai, Koordinator, Keterangan`; includes filled example rows, a **"Daftar Pegawai"** reference sheet (valid names + NIP + jabatan), and clear fill-in instructions. Frontend "Unduh Template" now points to this endpoint.
- **Multiple petugas per activity**: the `Pegawai` column supports several employees separated by **semicolon (`;`)** — chosen because employee names themselves contain commas (e.g. "Apt. Nina Marlina, S.Farm"), which broke comma splitting. Parser (`/api/jadwal/import/parse`) now pre-matches names → `pegawai_ids` and returns `pegawai_unmatched`.
- **Import preview employee picker**: each preview row shows matched employees as removable chips plus a **"Pilih Petugas"** multi-select popover (choose from the real employee list), and an amber warning listing names that didn't auto-match. Bulk import (`/api/jadwal/bulk`) now accepts explicit `pegawai_ids` (falls back to name matching).
- Verified end-to-end: 3 comma-containing names round-trip correctly via the template; unmatched-name warning + manual picker render; pytest 13/13 still pass.
