# Checklist rules (conditional document logic)

## Purpose

Map **Kathryn’s checklist playbook** (see `reference/Checklist Automation_.xlsx` and the Lovable prototype in `kathrynportal-main`) to the **backend rules engine** and `DB/schema.*` tables (v1.1):

- `document_types`
- `document_sets` + `document_set_members` — reusable bundles; a type can belong to many sets
- `conditional_rules` — `kind`, optional `triggers_json`, optional `transaction_type` / `property_type`
- `conditional_rule_sets` — which **sets** a rule merges in when it matches
- `conditional_rule_documents` — extra required/optional types not covered by sets (or legacy-style rows)
- `project_documents.source_document_set_id` — which set produced a checklist row (optional audit)

See **`Docs/product-summary.md`** for the resolution algorithm (union, dedupe).

## What to document here

1. **Inputs** that drive rules (transaction type, property type, year built, HOA, representation side, county, etc.) and how they map to `triggers_json` vs typed columns.
2. **Each rule** — name, `kind`, active flag, match conditions, linked **document sets** (`conditional_rule_sets`), plus any `conditional_rule_documents` extras.
3. **Edge cases** — dual agency, luxury condo, TBD escrow, overlapping sets, dedupe rules.
4. **Diff vs Excel** — any row in the spreadsheet that is intentionally not automated in Phase 1.

## Implementation note

Seed data lives in:

- `Docs/Checklist Automation_.xlsx` — source workbook
- `backend/seeds/document-rules.csv` — generated export (commit to git)
- `backend/seeds/vault-template-map.csv` — map checklist names → CRM vault filenames for `storedFileId` at seed time

```bash
# After editing the Excel file:
python backend/scripts/export_checklist_from_excel.py

# Apply to database (local or Render via backend/.env.render):
cd backend && npm run db:seed:document-rules
```

Upload PDFs to **CRM Documents** on live before seeding so vault links resolve.
