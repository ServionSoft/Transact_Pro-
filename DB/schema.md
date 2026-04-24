# Kathryn Portal — Database Schema (Visualization)

> Phase 1 schema for the Real Estate Transaction Management Portal.
>
> **Schema version:** `1.1.0` (see `schema.json` `meta` in this folder). Product intent: `Docs/product-summary.md` (from repo root).
>
> Diagrams below are **Mermaid ERD**. They render natively in GitHub, VS Code markdown preview, and Cursor markdown preview.
>
> Conventions:
> - `snake_case`, plural table names
> - every table: `id` (PK), `created_at`, `updated_at`
> - `deleted_at` where soft delete is useful
> - FK names follow `<table_singular>_id`
> - PK = Primary Key · FK = Foreign Key · UK = Unique Key

---

## 0. Domain overview (master map)

```mermaid
erDiagram
    USERS ||--o{ PROJECT_ASSIGNMENTS : "works"
    USERS ||--o{ INTEGRATION_ACCOUNTS : "connects"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ ACTIVITY_LOGS : "acts"

    CLIENTS ||--o{ PROJECTS : "owns"
    CONTACTS ||--o{ PROJECT_PARTIES : "is party in"
    PROJECTS ||--o{ PROJECT_PARTIES : "has parties"
    PROJECTS ||--o{ PROJECT_ASSIGNMENTS : "assigned to"

    PROJECTS ||--o{ PROJECT_DOCUMENTS : "has"
    PROJECTS ||--o{ PROJECT_FOLDERS : "organizes"
    PROJECTS ||--o{ STORED_FILES : "txn_files"
    PROJECTS ||--o{ PROJECT_TASKS : "has"
    PROJECTS ||--o{ PROJECT_DEADLINES : "has"
    PROJECTS ||--o{ EMAILS : "logs"
    PROJECTS ||--o{ DOCUSIGN_ENVELOPES : "sends"
    PROJECTS ||--o{ GOOGLE_DRIVE_FOLDER_LINKS : "mirrors"

    DOCUMENT_TYPES ||--o{ PROJECT_DOCUMENTS : "instance of"
    DOCUMENT_TYPES ||--|| DOCUSIGN_TEMPLATES : "template for"
    DOCUSIGN_TEMPLATES ||--o{ DOCUSIGN_TEMPLATE_FIELDS : "field coords"

    DOCUMENT_SETS ||--o{ DOCUMENT_SET_MEMBERS : "contains"
    DOCUMENT_TYPES ||--o{ DOCUMENT_SET_MEMBERS : "in_set"
    CONDITIONAL_RULES ||--o{ CONDITIONAL_RULE_SETS : "applies_sets"
    DOCUMENT_SETS ||--o{ CONDITIONAL_RULE_SETS : "via_rule"
    DOCUMENT_SETS ||--o{ PROJECT_DOCUMENTS : "checklist_source"

    CONDITIONAL_RULES ||--o{ CONDITIONAL_RULE_DOCUMENTS : "requires"
    DOCUMENT_TYPES  ||--o{ CONDITIONAL_RULE_DOCUMENTS : "included in"

    GOOGLE_DRIVE_LIBRARY_ROOTS ||--o{ STORED_FILES : "library_files"
    USERS ||--o{ GOOGLE_DRIVE_LIBRARY_ROOTS : "owns_drive_root"

    DOCUSIGN_ENVELOPES ||--o{ DOCUSIGN_ENVELOPE_DOCUMENTS : "bundles"
    DOCUSIGN_ENVELOPES ||--o{ DOCUSIGN_ENVELOPE_RECIPIENTS : "routes to"
    DOCUSIGN_ENVELOPES ||--o{ DOCUSIGN_WEBHOOK_EVENTS : "callbacks"
    PROJECT_DOCUMENTS  ||--o{ DOCUSIGN_ENVELOPE_DOCUMENTS : "sent in"

    EMAIL_TEMPLATES ||--o{ EMAILS : "renders"
    EMAILS ||--o{ EMAIL_ATTACHMENTS : "has"
    STORED_FILES ||--o{ EMAIL_ATTACHMENTS : "attached as"

    PROJECT_DEADLINES ||--o{ REMINDER_DRAFTS : "triggers"
    PROJECTS ||--o{ CALENDAR_EVENTS : "surfaces on"
```

---

## 1. Authentication & team

```mermaid
erDiagram
    USERS {
        bigint id PK
        string name
        string email UK
        string password_hash
        enum   role "admin | coordinator"
        enum   status "active | invited | inactive"
        datetime last_active_at
        datetime joined_at
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    USER_INVITES {
        bigint id PK
        string email
        bigint invited_by_user_id FK
        string token UK
        datetime expires_at
        datetime accepted_at
        datetime created_at
        datetime updated_at
    }

    PROJECT_ASSIGNMENTS {
        bigint id PK
        bigint project_id FK
        bigint user_id FK
        bigint assigned_by_user_id FK
        datetime created_at
        datetime updated_at
    }

    USERS ||--o{ USER_INVITES : "invites"
    USERS ||--o{ PROJECT_ASSIGNMENTS : "assigned to"
    PROJECTS ||--o{ PROJECT_ASSIGNMENTS : "has assignees"
```

---

## 2. Contacts directory + clients

```mermaid
erDiagram
    CONTACTS {
        bigint id PK
        string full_name
        string email
        string phone
        string company
        enum   role "listing_agent | buyers_agent | buyer | seller | escrow_officer | escrow_assistant | lender | other"
        text   notes
        bigint created_by_user_id FK
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    CLIENTS {
        bigint id PK
        string name
        string email
        string phone
        string company
        string agent_role_text
        enum   status "active | inactive | prospect"
        text   notes
        string primary_address
        string city
        string state
        string zip
        bigint created_by_user_id FK
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    USERS ||--o{ CONTACTS : "created"
    USERS ||--o{ CLIENTS  : "created"
```

> Note: `clients` ≈ agents Kathryn repeatedly works for.
> `contacts` = everyone else (buyers, sellers, escrow, lenders). Can be unified into one table later with an `is_client` flag if preferred.

---

## 3. Projects / transactions (core)

```mermaid
erDiagram
    PROJECTS {
        bigint id PK
        string name
        bigint client_id FK
        enum   transaction_type "listing | buyer_file"
        enum   stage "listing_prep | listing_complete | in_escrow | ready_to_close | closed"
        string property_address
        string city
        string state
        string zip
        string year_built
        string property_type
        string representation_side
        decimal list_price
        bigint escrow_officer_contact_id FK
        string escrow_company
        string next_step_text
        date   next_step_date
        bigint created_by_user_id FK
        datetime closed_at
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    PROJECT_PARTIES {
        bigint id PK
        bigint project_id FK
        bigint contact_id FK
        enum   party_role "buyer | seller | listing_agent | buyers_agent | escrow_officer | escrow_assistant | lender | other"
        bool   is_primary
        datetime created_at
        datetime updated_at
    }

    CLIENTS    ||--o{ PROJECTS        : "owns"
    CONTACTS   ||--o{ PROJECTS        : "escrow officer"
    PROJECTS   ||--o{ PROJECT_PARTIES : "has"
    CONTACTS   ||--o{ PROJECT_PARTIES : "joins"
    USERS      ||--o{ PROJECTS        : "created"
```

---

## 4. Document checklist (smart / conditional)

```mermaid
erDiagram
    DOCUMENT_TYPES {
        bigint id PK
        string code UK "e.g. TDS, NHD, LISTING_AGREEMENT"
        string display_name
        string description
        bool   is_standard_car_form
        string form_number
        string form_version
        bool   is_active
        datetime created_at
        datetime updated_at
    }

    DOCUMENT_SETS {
        bigint id PK
        string name
        text   description
        int    sort_order
        bool   is_active
        bigint created_by_user_id FK
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    DOCUMENT_SET_MEMBERS {
        bigint id PK
        bigint document_set_id FK
        bigint document_type_id FK
        bool   required
        int    sort_order
        datetime created_at
        datetime updated_at
    }

    CONDITIONAL_RULES {
        bigint id PK
        string name
        enum   kind "standard | conditional"
        json   triggers_json "AND match fields"
        enum   transaction_type "listing | buyer_file | nullable"
        enum   property_type "single_family | condo | any | nullable"
        bool   is_active
        bigint created_by_user_id FK
        datetime created_at
        datetime updated_at
    }

    CONDITIONAL_RULE_SETS {
        bigint id PK
        bigint rule_id FK
        bigint document_set_id FK
        datetime created_at
        datetime updated_at
    }

    CONDITIONAL_RULE_DOCUMENTS {
        bigint id PK
        bigint rule_id FK
        bigint document_type_id FK
        bool   required
        datetime created_at
        datetime updated_at
    }

    PROJECT_DOCUMENTS {
        bigint id PK
        bigint project_id FK
        bigint document_type_id FK "nullable for fully custom"
        bigint source_document_set_id FK "nullable provenance"
        string display_name
        enum   status "pending | needs_buyer_signature | needs_seller_signature | out_for_signature | signed_needs_upload | uploaded_to_brokerage | completed | other"
        string custom_status_text
        bool   required
        bigint current_file_id FK "stored_files.id"
        bigint created_by_user_id FK
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    PROJECT_DOCUMENT_NOTES {
        bigint id PK
        bigint project_document_id FK
        bigint author_user_id FK
        text   body
        datetime created_at
        datetime updated_at
    }

    PROJECT_DOCUMENT_STATUS_HISTORY {
        bigint id PK
        bigint project_document_id FK
        string from_status
        string to_status
        bigint changed_by_user_id FK
        string reason
        datetime created_at
    }

    USERS                       ||--o{ DOCUMENT_SETS              : "created"
    DOCUMENT_SETS               ||--o{ DOCUMENT_SET_MEMBERS       : "has"
    DOCUMENT_TYPES              ||--o{ DOCUMENT_SET_MEMBERS       : "member"
    CONDITIONAL_RULES           ||--o{ CONDITIONAL_RULE_SETS      : "merges_sets"
    DOCUMENT_SETS               ||--o{ CONDITIONAL_RULE_SETS      : "included"
    CONDITIONAL_RULES           ||--o{ CONDITIONAL_RULE_DOCUMENTS : "requires"
    DOCUMENT_TYPES              ||--o{ CONDITIONAL_RULE_DOCUMENTS : "listed in"
    PROJECTS                    ||--o{ PROJECT_DOCUMENTS          : "has"
    DOCUMENT_TYPES              ||--o{ PROJECT_DOCUMENTS          : "type of"
    DOCUMENT_SETS               ||--o{ PROJECT_DOCUMENTS          : "sourced_from"
    PROJECT_DOCUMENTS           ||--o{ PROJECT_DOCUMENT_NOTES     : "notes"
    PROJECT_DOCUMENTS           ||--o{ PROJECT_DOCUMENT_STATUS_HISTORY : "history"
```

---

## 5. Tasks

```mermaid
erDiagram
    PROJECT_TASKS {
        bigint id PK
        bigint project_id FK
        string title
        enum   stage "listing_prep | listing_complete | in_escrow | ready_to_close | closed"
        enum   status "pending | in_progress | complete"
        date   due_date
        datetime completed_at
        bigint assigned_to_user_id FK
        datetime created_at
        datetime updated_at
    }

    PROJECTS ||--o{ PROJECT_TASKS : "roadmap"
    USERS    ||--o{ PROJECT_TASKS : "assignee"
```

---

## 6. File storage + folder system

```mermaid
erDiagram
    PROJECT_FOLDERS {
        bigint id PK
        bigint project_id FK
        bigint parent_folder_id FK "self-referential, nullable"
        string name
        bool   is_system "auto-created vs user-created"
        datetime created_at
        datetime updated_at
    }

    GOOGLE_DRIVE_LIBRARY_ROOTS {
        bigint id PK
        enum   purpose "master_templates | ..."
        string label
        string drive_folder_id
        bigint drive_account_user_id FK
        datetime created_at
        datetime updated_at
    }

    STORED_FILES {
        bigint id PK
        enum   storage_scope "transaction | template_library"
        bigint project_id FK "null when template_library"
        bigint folder_id FK "nullable = root"
        bigint google_drive_library_root_id FK "library sync"
        string name
        string storage_key "S3 key or local path"
        bigint size_bytes
        string mime_type
        bigint uploaded_by_user_id FK "nullable if external"
        enum   source "manual_upload | docusign_signed_return | google_drive_sync | email_inbound"
        string drive_file_id
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    GOOGLE_DRIVE_FOLDER_LINKS {
        bigint id PK
        bigint project_id FK
        bigint project_folder_id FK "nullable for root"
        string drive_folder_id
        bigint drive_account_user_id FK
        datetime synced_at
        datetime created_at
        datetime updated_at
    }

    PROJECTS        ||--o{ PROJECT_FOLDERS            : "contains"
    PROJECT_FOLDERS ||--o{ PROJECT_FOLDERS            : "subfolders"
    PROJECT_FOLDERS ||--o{ STORED_FILES               : "holds"
    PROJECTS        ||--o{ STORED_FILES               : "txn_scope"
    GOOGLE_DRIVE_LIBRARY_ROOTS ||--o{ STORED_FILES      : "library_scope"
    USERS           ||--o{ GOOGLE_DRIVE_LIBRARY_ROOTS : "drive_account"
    PROJECTS        ||--o{ GOOGLE_DRIVE_FOLDER_LINKS  : "mirrors"
    USERS           ||--o{ STORED_FILES               : "uploaded"
```

---

## 7. DocuSign template engine (core automation)

```mermaid
erDiagram
    DOCUSIGN_TEMPLATES {
        bigint id PK
        bigint document_type_id FK UK
        string docusign_template_id "external"
        bigint pdf_reference_file_id FK "stored_files.id"
        int    version
        bigint created_by_user_id FK
        datetime created_at
        datetime updated_at
    }

    DOCUSIGN_TEMPLATE_FIELDS {
        bigint id PK
        bigint template_id FK
        enum   role "seller | buyer | listing_agent | buyers_agent | escrow_officer | other"
        enum   field_type "signature | initial | date | text | checkbox"
        int    page_number
        float  x_anchor
        float  y_anchor
        float  width
        float  height
        string anchor_string "alternative to x/y"
        bool   is_required
        datetime created_at
        datetime updated_at
    }

    DOCUSIGN_ENVELOPES {
        bigint id PK
        bigint project_id FK
        string docusign_envelope_id "external"
        enum   status "created | sent | delivered | completed | declined | voided"
        bigint sent_by_user_id FK
        datetime sent_at
        datetime completed_at
        datetime created_at
        datetime updated_at
    }

    DOCUSIGN_ENVELOPE_DOCUMENTS {
        bigint id PK
        bigint envelope_id FK
        bigint project_document_id FK
        bigint template_id FK "nullable for non-standard"
        datetime created_at
        datetime updated_at
    }

    DOCUSIGN_ENVELOPE_RECIPIENTS {
        bigint id PK
        bigint envelope_id FK
        bigint contact_id FK "nullable for ad-hoc"
        string email
        string name
        enum   role "seller | buyer | listing_agent | buyers_agent | escrow_officer | other"
        int    routing_order
        enum   status "created | sent | delivered | signed | declined"
        datetime signed_at
        datetime created_at
        datetime updated_at
    }

    DOCUSIGN_WEBHOOK_EVENTS {
        bigint id PK
        bigint envelope_id FK
        string event_type
        json   raw_payload
        datetime received_at
        datetime created_at
    }

    DOCUMENT_TYPES      ||--|| DOCUSIGN_TEMPLATES            : "has template"
    DOCUSIGN_TEMPLATES  ||--o{ DOCUSIGN_TEMPLATE_FIELDS      : "fields"
    STORED_FILES        ||--o{ DOCUSIGN_TEMPLATES            : "reference pdf"

    PROJECTS            ||--o{ DOCUSIGN_ENVELOPES            : "sends"
    DOCUSIGN_ENVELOPES  ||--o{ DOCUSIGN_ENVELOPE_DOCUMENTS   : "bundles"
    DOCUSIGN_ENVELOPES  ||--o{ DOCUSIGN_ENVELOPE_RECIPIENTS  : "routes"
    DOCUSIGN_ENVELOPES  ||--o{ DOCUSIGN_WEBHOOK_EVENTS       : "callbacks"

    PROJECT_DOCUMENTS   ||--o{ DOCUSIGN_ENVELOPE_DOCUMENTS   : "included in"
    DOCUSIGN_TEMPLATES  ||--o{ DOCUSIGN_ENVELOPE_DOCUMENTS   : "applied"
    CONTACTS            ||--o{ DOCUSIGN_ENVELOPE_RECIPIENTS  : "recipient"
```

---

## 8. Email (Gmail + templates + logs)

```mermaid
erDiagram
    EMAIL_TEMPLATES {
        bigint id PK
        string name
        string category
        string subject
        text   body
        bigint created_by_user_id FK
        datetime created_at
        datetime updated_at
    }

    EMAILS {
        bigint id PK
        bigint project_id FK
        bigint client_id FK
        bigint template_id FK
        enum   direction "outbound | inbound"
        string subject
        text   body
        string from_address
        string to_address
        string cc
        string bcc
        string gmail_message_id
        bigint sent_by_user_id FK
        datetime sent_at
        datetime created_at
        datetime updated_at
    }

    EMAIL_ATTACHMENTS {
        bigint id PK
        bigint email_id FK
        bigint stored_file_id FK
        datetime created_at
        datetime updated_at
    }

    EMAIL_TEMPLATES ||--o{ EMAILS              : "renders"
    PROJECTS        ||--o{ EMAILS              : "logs"
    CLIENTS         ||--o{ EMAILS              : "about"
    EMAILS          ||--o{ EMAIL_ATTACHMENTS   : "has"
    STORED_FILES    ||--o{ EMAIL_ATTACHMENTS   : "attached as"
```

---

## 9. Deadlines · reminders · calendar

```mermaid
erDiagram
    PROJECT_DEADLINES {
        bigint id PK
        bigint project_id FK
        string title
        date   due_date
        enum   type "deadline | reminder | task"
        bool   is_completed
        datetime created_at
        datetime updated_at
    }

    REMINDER_DRAFTS {
        bigint id PK
        bigint project_id FK
        bigint project_deadline_id FK
        string reminder_type
        string subject
        text   body
        string to_address
        enum   status "draft | sent | dismissed"
        bigint sent_by_user_id FK
        datetime sent_at
        datetime created_at
        datetime updated_at
    }

    CALENDAR_EVENTS {
        bigint id PK
        bigint project_id FK
        string title
        date   event_date
        enum   type "deadline | reminder | task"
        string source_ref_type "project_deadline | project_task | reminder_draft"
        bigint source_ref_id
        datetime created_at
        datetime updated_at
    }

    PROJECTS          ||--o{ PROJECT_DEADLINES : "has"
    PROJECT_DEADLINES ||--o{ REMINDER_DRAFTS   : "drafts"
    PROJECTS          ||--o{ CALENDAR_EVENTS   : "surfaces on"
```

> `calendar_events` can be implemented as a **view** unioning deadlines + tasks + reminder_drafts if you prefer not to store duplicate rows.

---

## 10. Integrations · notifications · audit

```mermaid
erDiagram
    INTEGRATION_ACCOUNTS {
        bigint id PK
        bigint user_id FK
        enum   provider "docusign | gmail | google_drive"
        string account_email
        text   access_token_encrypted
        text   refresh_token_encrypted
        datetime token_expires_at
        string scope
        bool   is_active
        datetime created_at
        datetime updated_at
    }

    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK
        string type "docusign_signed | reminder_draft_created | ..."
        string title
        text   body
        bigint ref_project_id FK
        bigint ref_document_id FK
        datetime read_at
        datetime created_at
        datetime updated_at
    }

    ACTIVITY_LOGS {
        bigint id PK
        bigint user_id FK "nullable for system"
        bigint project_id FK
        string action "project.created | document.status_changed | envelope.sent"
        string entity_type
        bigint entity_id
        json   meta
        datetime created_at
    }

    USERS    ||--o{ INTEGRATION_ACCOUNTS : "connects"
    USERS    ||--o{ NOTIFICATIONS        : "receives"
    USERS    ||--o{ ACTIVITY_LOGS        : "acts"
    PROJECTS ||--o{ NOTIFICATIONS        : "about"
    PROJECTS ||--o{ ACTIVITY_LOGS        : "scoped to"
```

---

## Design decisions to lock before coding migrations

1. **Unify `clients` + `contacts`?** Single `contacts` table + `is_client` flag is cleaner long-term; two tables match existing frontend more directly.
2. **Where do files physically live?** Local disk vs S3/compatible vs always in Drive — changes the meaning of `stored_files.storage_key`.
3. **Version history for documents?** Current schema has 1:1 `project_documents.current_file_id`. If you need full version history, add a `project_document_files` join table and keep `current_file_id` as a pointer to the latest.
4. **`calendar_events` as table vs view?** A view keeps data DRY; a table is easier to index and filter in API layer.
5. **Address normalization?** Currently addresses are stored as strings on `projects`, `clients`, `contacts`. Can later extract into an `addresses` table if needed.
6. **Soft delete depth?** Only on meaningful entities (clients, projects, documents, stored files, users). Avoid on logs/history tables.
7. **Document sets vs one row per type in rules?** v1.1 uses `document_sets` + `document_set_members` (M:N) and `conditional_rule_sets` so the same `document_type` can appear in multiple sets; rules merge sets. Inline extras remain on `conditional_rule_documents`.

---

## Minimum subset to run the current frontend (if you want a smaller start)

If you want to wire up the existing `mockData.ts`-based UI first with the minimum schema:

- `users`
- `clients`
- `contacts`
- `projects`
- `project_parties`
- `document_types`
- `document_sets` + `document_set_members`
- `conditional_rules` + `conditional_rule_sets` + `conditional_rule_documents`
- `project_documents` + `project_document_notes`
- `project_tasks`
- `project_deadlines`
- `stored_files` + `project_folders`
- `email_templates` + `emails`
- `reminder_drafts`

DocuSign / Gmail / Drive / notifications / audit can be added in a second migration once the UI is backed by real data.
