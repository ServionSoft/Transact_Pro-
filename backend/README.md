# Kathryn Portal — Backend API

Express + TypeScript starter. Expand into routes → controllers → services → repositories as features land.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill **`DATABASE_URL`** in `.env` (never commit `.env`). Health check: `GET http://localhost:4000/health` includes `database: "up" | "down" | "not_configured"`.

### SQL migrations

From `backend/`:

```bash
npm run db:migrate
```

Applies versioned SQL under **`db/migration/`** and records names in **`public.schema_migrations`**. See **`db/README.md`** for reset + regenerating from `DB/schema_live.sql`.

## Database connection (`DATABASE_URL`)

1. In **pgAdmin**, connect to your server and note **host**, **port** (default `5432`), **database** (e.g. `transactpro_dev`), **user**, and **password**.
2. Build a URL:

   `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`

   Special characters in the password must be **URL-encoded** (e.g. `@` → `%40`).

3. Put that string in **`backend/.env`** as `DATABASE_URL=...`.

4. **CRM vault:** the Documents UI calls the API with project slug `crm-doc-vault`. That maps to **`CRM_VAULT_PROJECT_ID`** (default `1` after the internal seed project insert). Change the env value if your vault row uses another id.

5. **`PUBLIC_API_URL`:** set to the API’s public base (e.g. `http://localhost:4000`) so **download** links work when the Vite app runs on a **different port** (e.g. `8080`).

## Document rules API (Settings)

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/document-rules` | List all `conditional_rules` with hydrated `documents` and `actions` |
| `GET` | `/api/document-rules/:id` | Load one rule by numeric id |
| `POST` | `/api/document-rules` | Create rule (JSON body: `name`, `kind`, `triggers`, `documents`, `actions`, `isActive`) |
| `PUT` | `/api/document-rules/:id` | Replace rule (same body shape) |
| `PATCH` | `/api/document-rules/:id` | `{ "isActive": boolean }` only |
| `DELETE` | `/api/document-rules/:id` | Delete rule (cascades `conditional_rule_sets` / `conditional_rule_documents`) |

**Persistence:** Standard baseline rows from the UI are stored in **`conditional_rules.documents_json`**. When that column is **null**, standard `documents` are still hydrated from **`conditional_rule_sets`** + **`document_set_members`** (seeded templates). Conditional actions use **`actions_json`** (optional per-row **`storedFileId`**).

Requires **`DATABASE_URL`**, **`npm run db:migrate`** (includes `documents_json` from V011), and **`npm run db:seed:document-rules`** if you want the sample catalog rows.

## Clients API

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/clients` | List non-archived clients (`deleted_at IS NULL`) with `projectCount` |
| `GET` | `/api/clients/:id` | Load one client by numeric id |
| `POST` | `/api/clients` | Create client (`name`, `email`, `phone`, `company`, `role`, `status`, `propertyAddress`, `city`, `state`, `zip`, `notes`) |
| `PUT` | `/api/clients/:id` | Update client (same shape as create) |
| `PATCH` | `/api/clients/:id/archive` | Soft-delete client (`deleted_at = now()`) |
| `DELETE` | `/api/clients/:id/permanent` | Hard delete only when client has no linked projects |

`status` accepts `Active` / `Inactive` / `Prospect` in the API payload and maps to DB enum values (`active`, `inactive`, `prospect`).  
`created_by_user_id` uses `DEFAULT_UPLOAD_USER_ID` when that env value exists and points at a real user row; otherwise it is written as `NULL`.

## Stored files API (Documents page)

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/projects/:projectId/stored-files` | List `stored_files` + `project_folders` for the project |
| `POST` | `/api/projects/:projectId/stored-files` | Multipart field **`file`** (one file); optional **`folder_id`** in the same form |
| `PATCH` | `/api/projects/:projectId/stored-files/:fileId` | JSON `{ "folder_id": number \| null }` |
| `DELETE` | `/api/projects/:projectId/stored-files/:fileId` | Delete row and remove binary from disk |
| `GET` | `/api/projects/:projectId/stored-files/:fileId/download` | Stream the file |
| `POST` | `/api/projects/:projectId/file-folders` | JSON `{ "name", "parent_id": number \| null }` |
| `DELETE` | `/api/projects/:projectId/file-folders/:folderId` | Delete empty folder (no child folders, no files); `409` if not empty |

Rows are written to **`stored_files`** (`storage_scope = 'transaction'`, `source = 'manual_upload'`). Binaries live under **`UPLOAD_DIR`** (default `./uploads`). Relative path is **`storage_key`**: unfiled files use `doc_upload/<projectId>/inbox/<uuid>.<ext>`; filed files use `doc_upload/<projectId>/folders/<folder_id>/<uuid>.<ext>`. Multer stages under `uploads/doc_upload/.staging/` then the file is moved into the final folder. **`folder_id`** is `NULL` for inbox, or the `project_folders.id` when filed. Deleting a file removes the blob and prunes empty parent dirs under that project; deleting an empty folder removes `folders/<folder_id>/` on disk as well.

## Layout

| Path | Purpose |
|------|---------|
| `src/index.ts` | HTTP server bootstrap |
| `src/routes/` | Route registration (wiring only) |
| `src/controllers/` | Thin HTTP handlers (e.g. `storedFilesController.ts`) |
| `src/middleware/` | Express middleware (e.g. project resolution, multer) |
| `src/services/` | Business logic |
| `src/integrations/` | DocuSign, Gmail, Drive clients |
| `src/config/` | Env loading, app config |
| `db/migration/` | SQL migrations (source of truth for DB schema; see `db/README.md`) |
| `seeds/` | Seed scripts / JSON for `document_types`, rules, templates |
| `tests/` | Automated tests |

## Migrations vs `DB/`

- **`db/migration/`** — what actually runs against PostgreSQL in dev/staging/prod.
- **`../DB/schema.md`** and **`../DB/schema.json`** — design docs (v1.1 adds `document_sets`, `document_set_members`, `conditional_rule_sets`, `stored_files.storage_scope`, `google_drive_library_roots`, `project_documents.source_document_set_id`). **`../Docs/product-summary.md`** explains checklist resolution and library vs transaction files. **`../Docs/schema.md`** mirrors the markdown ERD only; **`schema.json` is only under `../DB/`.**
