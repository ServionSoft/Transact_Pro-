# TransactPro (Kathryn Portal)

Monorepo layout for the Real Estate Transaction Management Portal: **React (Vite) frontend**, **Node backend** (to be implemented), **DB design artifacts**, and **docs**.

## Repository layout

| Path | Purpose |
|------|---------|
| `kathrynportal-main/` | Frontend — Vite + React + TypeScript + Tailwind/shadcn. Run `npm install` and `npm run dev` here. |
| `backend/` | API server, integrations (DocuSign, Gmail, Google Drive), migrations, seeds, tests. |
| `DB/` | Schema visualization (`schema.md`, `schema.json`) and ERD exports (`diagrams/`). |
| `Docs/` | Architecture notes, API contracts, product summary, checklist rules (non-code). |
| `reference/` | Source materials (SOW PDF, checklist Excel, extracted text). Copy or move those files here if they still sit at repo root. |
| `scripts/` | Optional one-off importers / automation (see `scripts/README.md`). |

## Quick start

### Frontend

```bash
cd kathrynportal-main
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

Health check: `GET http://localhost:4000/health` (default port from `backend/.env.example`).

## Environment

- Copy `backend/.env.example` to `backend/.env` and fill values (never commit `.env`).
- Frontend may later use `kathrynportal-main/.env` with `VITE_API_URL` pointing at the backend.

## Database

- **Design / ERD:** `DB/schema.md`, `DB/schema.json`, and `Docs/diagrams/full_erd.mmd` (exported `full_erd.svg`).
- **Product + checklist model (v1.1):** `Docs/product-summary.md` — document sets, rules, template library vs transaction files.
- **Migrations (when added):** live under `backend/migrations/` — that folder is the source of truth for the running database; keep `DB/schema.md` / `DB/schema.json` updated when the design changes (`Docs/schema.md` should track `DB/schema.md`).
