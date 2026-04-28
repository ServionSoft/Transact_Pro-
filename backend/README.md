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
| `PATCH` | `/api/clients/:id/unarchive` | Restore archived client (`deleted_at = null`) |
| `DELETE` | `/api/clients/:id/permanent` | Hard delete only when client has no linked projects |

**RBAC:** After auth, each route checks the matching `clients.*` permission (`view`, `create`, `edit`, `archive`, `delete_permanent`). Role alone (`admin` / `coordinator`) is not enough when the user’s effective permissions come from a permission profile.

`status` accepts `Active` / `Inactive` / `Prospect` in the API payload and maps to DB enum values (`active`, `inactive`, `prospect`).  
`created_by_user_id` uses `DEFAULT_UPLOAD_USER_ID` when that env value exists and points at a real user row; otherwise it is written as `NULL`.

## Auth API

| Method | Path | Purpose |
|--------|------|--------|
| `POST` | `/api/auth/login` | Validate credentials, return access + refresh tokens |
| `GET` | `/api/auth/me` | Return current authenticated user profile |
| `POST` | `/api/auth/refresh` | Rotate refresh token and issue fresh access token |
| `POST` | `/api/auth/logout` | Stateless logout acknowledgement (client clears tokens) |
| `POST` | `/api/auth/accept-invite` | Body `{ token, password }` — activate invited user (see Team Members invite flow) |

Required env vars: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, optional `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`.  
Bootstrap first super admin: `npm run db:seed:admin-user` (requires `ADMIN_SEED_PASSWORD` in `backend/.env`). Run `npm run db:migrate` first so enum `super_admin` and permission tables exist.

## Team members & dynamic permissions (RBAC v2)

Apply migrations **`V012__user_role_super_admin_enum.sql`** then **`V013__rbac_permissions.sql`** (`npm run db:migrate` — two transactions so PostgreSQL allows using `super_admin`). Then **`V014__role_profiles.sql`**: `role_profiles`, `role_profile_permissions`, `users.role_profile_id`, permission `roles.manage`, seeded default profiles and backfill. Then **`V016__designation_and_expanded_permissions.sql`**: adds `users.designation` and expands granular permission keys (documents, document rules, role profiles, project-wide access) so normal-user authorization can be fully permission-driven. Then **`V017__role_profile_default_designation_and_drop_base_role.sql`**: adds `role_profiles.default_designation` (pre-fill text for users) and drops legacy `role_profiles.base_role`. Then **`V019__normalize_non_super_roles.sql`**: normalizes all non-super users to `coordinator` so `admin/coordinator` tier semantics no longer drive access. Then **`V020__dedupe_active_user_emails.sql`**: one-time cleanup that soft-deactivates duplicate active users sharing the same email (keeps newest row).

Tables: `permissions`, `role_permissions`, `user_permissions`; `user_role` gains `super_admin`. Invites use `user_invites.token` (SHA-256 of the secret token).

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/team-members/permissions` | Permission catalog (checkbox labels) |
| `GET` | `/api/team-members/role-defaults/:role` | Default permission keys for a role |
| `GET` | `/api/team-members/meta/projects` | Project picker rows |
| `GET` | `/api/team-members` | List users |
| `GET` | `/api/team-members/:id` | User detail + effective permissions + project ids |
| `POST` | `/api/team-members` | Create user (`roleProfileId` required for non-super users; optional `designation`, `desiredPermissionKeys`, `projectIds`) |
| `POST` | `/api/team-members/invite` | Invite user (same body shape without password) |
| `PUT` | `/api/team-members/:id` | Update user |
| `PATCH` | `/api/team-members/:id/deactivate` | Soft-deactivate (`deleted_at`, `inactive`) |

### Role profiles (named permission bundles)

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/role-profiles` | List profiles (requires `team_members.create`, `invite`, or `edit`, or `role_profiles.view`) |
| `GET` | `/api/role-profiles/:id` | Profile detail + granted permission keys |
| `POST` | `/api/role-profiles` | Create profile (`role_profiles.create`) |
| `PUT` | `/api/role-profiles/:id` | Update profile (`role_profiles.edit`) |
| `DELETE` | `/api/role-profiles/:id` | Soft-delete profile if unused (`role_profiles.delete`) |

Env: `PUBLIC_APP_URL` (or `FRONTEND_APP_URL`) for invite links; `INVITE_TTL_HOURS` (default 168). Email sending is not wired yet; non-production responses may include `devToken` for testing.

## Route-by-route permissions (RBAC v1)

| Route group | Methods | Access |
|-------------|---------|--------|
| `/api/auth/*` | login/refresh/logout | Public |
| `/api/auth/me` | GET | Any authenticated user |
| `/api/clients` | GET/POST/PUT/PATCH archive/unarchive | `super_admin`, `admin`, `coordinator` |
| `/api/clients/:id/permanent` | DELETE | `super_admin`, `admin` |
| `/api/document-rules` | GET + GET by id | `super_admin`, `admin`, `coordinator` |
| `/api/document-rules` writes | POST/PUT/PATCH/DELETE | `super_admin`, `admin` |
| `/api/projects/:projectId/stored-files` reads | GET/list/download | `super_admin` OR `admin` OR assigned `coordinator` |
| `/api/projects/:projectId/stored-files` writes | POST/PATCH/DELETE files + folder create/delete | `super_admin` OR `admin` OR assigned `coordinator` |
| `/api/team-members*` | varies | JWT + permission keys (`team_members.*`, etc.); see Team members section |

Project-scoped routes additionally enforce assignment checks via `project_assignments` for users who are not `super_admin` or `admin`.

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
