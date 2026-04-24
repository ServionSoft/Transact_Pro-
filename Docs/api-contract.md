# API contract (draft)

Define REST (or RPC) shapes here as the backend is built. Target response shape (example):

**Success**

```json
{ "success": true, "data": {}, "message": "" }
```

**Error**

```json
{ "success": false, "error": { "code": "", "message": "" } }
```

## Domains to cover

- Auth / sessions
- Clients, contacts, projects
- Project documents (checklist CRUD, status) — include provenance fields per `DB/schema.json` v1.1 (`source_document_set_id`)
- **Document sets** — CRUD `document_sets` / `document_set_members`; **rules** — `conditional_rules`, `conditional_rule_sets`, `conditional_rule_documents` (see `Docs/product-summary.md`)
- Files (upload, download, folders) — respect `stored_files.storage_scope` (`transaction` vs `template_library`) and nullable `project_id`
- DocuSign (send envelope, webhook)
- Emails (templates, send, log)
- Deadlines, reminder drafts, calendar
- Settings (rules, team)

Link each endpoint to the tables in `DB/schema.json` as you add routes under `backend/src/routes/`.
