# Database migrations (SQL)

## Layout

| Path | Purpose |
|------|---------|
| `migration/V001__*.sql` … `V008__*.sql` | Baseline schema, generated from `../../DB/schema_live.sql` |
| `migration/V009__seed_dev_crm_vault.sql` | Dev rows: `clients` / `users` / `projects` id `1` for CRM file pool |
| `extractMigrationsFromSchemaLive.ts` | Regenerates `V001`–`V008` after you replace `DB/schema_live.sql` |
| `migrate.ts` | Applies pending `.sql` files and records them in `public.schema_migrations` |

## Commands (from `backend/`)

```bash
npm run db:migrate
```

Requires `DATABASE_URL` in `backend/.env`.

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
