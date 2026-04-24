# Database design artifacts

**Schema version `1.1.0`** — see `schema.json` → `meta`. Product narrative: `../Docs/product-summary.md`.

| File / folder | Purpose |
|---------------|---------|
| `schema.md` | Mermaid ERDs + column-level diagrams (human-readable). |
| `schema.json` | Machine-readable tables, enums, FK list (`relationships` array). |
| `../Docs/diagrams/` | Full ERD source (`full_erd.mmd`) and exported `full_erd.svg`. Regenerate SVG after graph changes if you use `@mermaid-js/mermaid-cli`. |

`Docs/schema.md` is kept in sync with this folder for browsing next to other documentation. **`schema.json` exists only here** (`DB/schema.json`) to avoid duplicate drift — link or copy into docs tooling if needed.

## Relationship to `../backend/db/migration/`

**SQL migrations** live in `../backend/db/migration/` (applied via `npm run db:migrate` from `backend/`). Baseline files can be regenerated from **`schema_live.sql`** with `npm run db:migrate:generate`. After logical model changes, update **`schema.md`** / **`schema.json`** here so this folder stays accurate for **visualization and reviews**.
