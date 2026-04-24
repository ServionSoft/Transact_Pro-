# Kathryn Portal — product summary (locked intent)

Companion to `DB/schema.json` **v1.1.0**. This is the narrative spec for what the data model supports; implementation order follows backend milestones.

## Core concepts

- **Transactions (`projects`)** — Listings and buyer files with parties, checklist, tasks, files, DocuSign, email, deadlines.
- **Document types (`document_types`)** — Master catalog of CAR forms and custom types.
- **Document sets (`document_sets` + `document_set_members`)** — Named bundles of types. The same type can appear in **many** sets (M:N). Sets carry ordering and required flags per member.
- **Rules (`conditional_rules`)** — Drive which checklist rows apply when a project is created. A rule has `kind` (`standard` | `conditional`), optional legacy-style `transaction_type` / `property_type`, and optional **`triggers_json`** for richer AND-matching (e.g. county, HOA).
- **Rule → sets (`conditional_rule_sets`)** — When a rule matches, its linked **document sets** are merged (union of members) into the checklist.
- **Rule → inline rows (`conditional_rule_documents`)** — Additional required/optional types not modeled as sets, or one-off additions.
- **Checklist provenance (`project_documents.source_document_set_id`)** — Optional FK to the set that contributed a row (audit and UX).

## Template library vs transaction files

- **`stored_files.storage_scope`** — `transaction` (default path: `project_id` + optional `project_folders`) vs **`template_library`** (master PDFs for the DocuSign template builder; `project_id` is null).
- **`google_drive_library_roots`** — Org-level Drive folder(s) for library masters, distinct from per-project `google_drive_folder_links`.
- **`docusign_templates.pdf_reference_file_id`** — Points at a library-scoped `stored_files` row for the canonical PDF used to place tabs.

## Checklist resolution (at project create)

1. Evaluate active `conditional_rules` using `kind`, `triggers_json`, and/or `transaction_type` / `property_type`.
2. For each matching rule, union all `document_types` from **`conditional_rule_sets`** → linked **`document_sets`** via **`document_set_members`**.
3. Add types from **`conditional_rule_documents`**.
4. De-duplicate by `document_type_id` while preserving strongest `required` and stable ordering.
5. Insert **`project_documents`** rows; set **`source_document_set_id`** when the row came from a resolved set.

## Integrations (high level)

- **DocuSign** — Templates per `document_type`; envelopes tied to `project_documents`.
- **Gmail** — Send/log; optional threading metadata in `emails`.
- **Google Drive** — Per-project folder links; optional library roots for template masters.

## Frontend note

Until the API exists, the Lovable app may use local/mock rules. The backend should become the **single source of truth** for rules and sets so new projects receive consistent checklists.
