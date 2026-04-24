# Integrations (Phase 1)

## DocuSign

- OAuth per user (or per org — decide in implementation).
- Envelope send with programmatic tabs from `docusign_templates` / `docusign_template_fields`.
- Webhook endpoint for envelope completion → update `project_documents`, store signed PDF in `stored_files`, notify user.

Document required env vars in `backend/.env.example` as you wire the SDK.

## Gmail (Google Workspace)

- OAuth for send + read (scope minimally).
- Send templated mail; log rows in `emails` with `gmail_message_id` when available.

## Google Drive (optional)

- OAuth; folder create + sync strategy.
- **Per transaction:** `google_drive_folder_links` maps portal folders to Drive.
- **Template library:** `google_drive_library_roots` holds org-level folder(s) for master PDFs; `stored_files` with `storage_scope = template_library` may reference `google_drive_library_root_id` and optional `drive_file_id`.
- If Drive is not used, portal `stored_files` + `project_folders` is the sole file store for transaction files; library masters can remain in object storage only.

## Security

- Never log access tokens or refresh tokens.
- Verify webhook signatures (DocuSign) before trusting payloads.
