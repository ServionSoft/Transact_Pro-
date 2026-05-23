# Database migrations (SQL)

## Layout

| Path | Purpose |
|------|---------|
| `migration/V001__*.sql` … `V008__*.sql` | Baseline schema, generated from `../../DB/schema_live.sql` |
| `migration/V009__seed_dev_crm_vault.sql` | Dev rows: `clients` / `users` / `projects` id `1` for CRM file pool |
| `migration/V010__document_rules_columns.sql` | `document_set_members.section_label`, `conditional_rules.actions_json` |
| `migration/V011__conditional_rules_documents_json.sql` | `conditional_rules.documents_json` (Settings baseline rows) |
| `extractMigrationsFromSchemaLive.ts` | Regenerates `V001`–`V008` after you replace `DB/schema_live.sql` |
| `migrate.ts` | Applies pending `.sql` files and records them in `public.schema_migrations` |

## Commands (from `backend/`)

```bash
npm run db:migrate
npm run db:seed:document-rules
```

Requires `DATABASE_URL` in `backend/.env`. The **document-rules** seed reads `backend/seeds/document-rules.csv` (export from `Docs/Checklist Automation_.xlsx`) and optional `backend/seeds/vault-template-map.csv` for CRM vault PDF links.

```bash
# After editing the Excel workbook:
python backend/scripts/export_checklist_from_excel.py
# or: npm run db:export-document-rules-csv   (from backend/)

npm run db:seed:document-rules
```

Idempotent: upserts `document_types`, `document_sets` (ids `10001` / `10002`), members, and `conditional_rules` (ids `10011`–`10019`). Vault `storedFileId` values are resolved at seed time from `stored_files` in CRM vault (`CRM_VAULT_PROJECT_ID`, default `1`).

Regenerate baseline SQL after a new pgAdmin schema dump:

```bash
npm run db:migrate:generate
```

Then review `migration/V001`–`V008`, run migrate on a **fresh** database (or adjust manually for drift).

## Reset dev database (empty `public`)

In pgAdmin, connect to `transactpro_dev` and run:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then:

```bash
npm run db:migrate
```

Do **not** commit `V009` assumptions to production without replacing seed data and passwords.
