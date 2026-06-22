# Questions & Comments — 6/21/26

**Source:** `Docs/Questions_Comments - 6_21_26.pdf`  
**Audience:** Product / dev handoff  
**Last reviewed:** 2026-05-19  

This document answers each question from the senior review PDF: what exists today, where it lives in the app, whether another feature already covers the same need, and suggested next steps.

---

## Legend

| Status | Meaning |
|--------|---------|
| **Done** | Implemented and usable |
| **Partial** | Some capability exists; gaps remain |
| **Not done** | Not implemented |

---

## Timeline tab

### Q1. Will the timeline PDF automatically be attached to the email when using “Email Timeline”? Or does it need to be downloaded and uploaded separately?

| | |
|---|---|
| **Status** | **Partial** |
| **Answer** | **No PDF attachment today.** “Email Timeline” inserts the timeline as **plain text in the email body** via the `{{timeline_table}}` token. Print/PDF is a **separate** action. |

**Where in the app**

| What | Location |
|------|----------|
| Email Timeline button | Transaction detail → **Timeline** tab → `Email timeline` |
| Print PDF button | Same tab → `Print PDF` → `/projects/:id/deadlines/print` |
| Text timeline in email | `kathrynportal-main/src/lib/emailTemplateTokens.ts` → `buildTimelineEmailComposePrefill()`, `{{timeline_table}}` |
| Timeline table text builder | `kathrynportal-main/src/lib/transactionTimelineFields.ts` → `buildTimelineTableText()` |
| Email template seed | `backend/db/migration/V044__email_template_timeline.sql` — template name **“Transaction Timeline”** |
| Handler | `kathrynportal-main/src/pages/ProjectDetailPage.tsx` → `handleEmailTimeline()` |

**Same thing elsewhere?**

- **Print PDF** produces a printable view (`ProjectDeadlinesPrintPage.tsx` + `TransactionTimelinePrintTable.tsx`) but does **not** attach to email.
- Email body text is functionally similar content to the print table, but **not** a file attachment.

**Suggestions**

1. **Clarify with senior:** Is inline text enough, or does she require a PDF file attached?
2. **If PDF required:** On “Email Timeline”, generate PDF (reuse print layout), pass `attachmentFileIds` to send API, attach via SMTP.
3. **Quick win:** Add UI note: *“Timeline is included in the email body. Use Print PDF if you need a separate file.”*
4. **Improvement:** Optional checkbox: “Attach PDF copy” when sending timeline email.

---

### Q2. There are two separate timeline emails — one to escrow/agents, one to buyer/seller. Can we have two buttons on the timeline tab?

| | |
|---|---|
| **Status** | **Not done** |
| **Answer** | **One button, one template** today. |

**Where in the app**

| What | Location |
|------|----------|
| Single button | `ProjectDetailPage.tsx` → Timeline tab → `Email timeline` |
| Template picker | `findTimelineEmailTemplate()` — first template with `{{timeline_table}}` or name containing “timeline” |
| Only seeded template | V044 — **“Transaction Timeline”** (agent-oriented copy: “Hi {{agent_name}}”) |

**Same thing elsewhere?**

- User can manually change recipient and template in **Emails** tab after Email Timeline opens compose — but there is no dedicated second button or second default template.

**Suggestions**

1. Add second template in DB/migration, e.g.:
   - **“Timeline — Escrow & Agents”** (escrow officer, LA/BA, TC)
   - **“Timeline — Client”** (buyer or seller; softer client-facing wording)
2. Replace one button with two:
   - `Email timeline (parties)` — prefill escrow + agent emails from `transactionRecipientSuggestions`
   - `Email timeline (client)` — prefill client email
3. Or one **split button** / dropdown: “Email timeline to…” → Parties | Client
4. Ensure migration **V044** (and new template migration) are run on staging/prod.

---

## Emails

### Q3. Can email drafts be saved?

| | |
|---|---|
| **Status** | **Partial** |
| **Answer** | **Reminder drafts yes; general email drafts no.** |

**Where in the app**

| What | Location |
|------|----------|
| Reminder drafts (saved, not sent) | Timeline tab → draft reminder dialog → `createProjectReminderDraftApi()` |
| Reminder draft storage | DB table `reminder_drafts`; reviewed on **Calendar** page |
| Transaction email compose | **Emails** tab (`TransactionEmailsTab.tsx`) — Send only |
| Global email page | `/email` (`EmailPage.tsx`) — Send only |
| Send API | `backend/src/services/projectsService.ts` → `createProjectEmail()` — inserts row and sends immediately |

**Same thing elsewhere?**

- **Reminder drafts** are the only “save for later” email flow. They are tied to deadlines/reminders, not free-form compose.
- Calendar “Save draft” (`CalendarPage.tsx` → `saveDraftFromEvent`) creates reminder drafts — same system.

**Suggestions**

1. Add **Save draft** on `TransactionEmailsTab` and optionally `EmailPage`.
2. Extend `emails` with `delivery_status = 'draft'` (or new `email_drafts` table).
3. Show **Drafts** list under Emails tab or Calendar reminders panel.
4. Reuse reminder-draft UX patterns (save → review → send/dismiss).

---

### Q4. Can email drafts be scheduled to send at a later time?

| | |
|---|---|
| **Status** | **Not done** |
| **Answer** | **No scheduled send.** |

**Where in the app**

- No `scheduled_at` on emails or drafts.
- No background job for deferred send.

**Same thing elsewhere?**

- None.

**Suggestions**

1. Add `scheduled_at` + `status = scheduled` on draft/sent email records.
2. Cron/worker: pick due rows, call existing `sendMailWithStoredSettings`.
3. UI: “Send now” vs “Schedule” with date/time on compose.
4. Lower priority than drafts + attachments unless senior needs it soon.

---

### Q5. Can document(s) in a folder be emailed directly from there, or download then upload?

| | |
|---|---|
| **Status** | **Not done** |
| **Answer** | **Must download manually today** — no “email from folder” action. |

**Where in the app**

| What | Location |
|------|----------|
| Stored files & folders | Transaction → **Stored Documents** tab (`TransactionDocumentsWorkspace.tsx`, `view` with attachments) |
| Download | Per-file download in stored documents UI |
| Folders | `project_folders` + `stored_files` per transaction |

**Same thing elsewhere?**

- **Document Checklist** can attach vault files to checklist rows but not email them directly.
- **Emails** tab compose has no “pick from stored documents” flow.

**Suggestions**

1. Add row actions: **Email file** / **Email folder** on Stored Documents.
2. Opens Emails tab compose with selected `stored_file_id`(s) as attachments (after Q6 is built).
3. For folders: attach all files in folder or zip server-side (if many files).

---

### Q6. How do we attach a document to an email?

| | |
|---|---|
| **Status** | **Not done** (schema only) |
| **Answer** | **No attach UI or API wiring.** |

**Where in the app**

| What | Location |
|------|----------|
| DB schema | `email_attachments` → links `emails.id` to `stored_files.id` (`DB/schema.json`) |
| Send API | `createProjectEmail()` — accepts `to`, `subject`, `body`, `templateId` only — **no attachments** |
| Compose UI | `TransactionEmailsTab.tsx`, `EmailPage.tsx` — no file picker; `EmailPage` hardcodes `attachments: []` |

**Same thing elsewhere?**

- `{{document_list}}` token lists **checklist document names** in the body — not file attachments.

**Suggestions**

1. API: `POST .../emails` accept `attachmentFileIds: string[]`.
2. On send: insert `email_attachments` rows; pass files to SMTP multipart.
3. UI: “Attach from stored documents” + optional “Attach from checklist”.
4. Show attached filenames in compose before send.

---

## Documents

### Q7. Can I save documents and folders not tied to a specific transaction? (Documents tab on left)

| | |
|---|---|
| **Status** | **Partial** |
| **Answer** | **Yes, but it is the CRM eSign template library — not a general file cabinet.** |

**Where in the app**

| What | Location |
|------|----------|
| Sidebar **Documents** | `/documents` → `DocumentsPage.tsx` |
| Backend identity | `CRM_DOCUMENT_VAULT_PROJECT_ID` = `"crm-doc-vault"` |
| Workspace | `TransactionDocumentsWorkspace` with `view="pool-only"` |
| Purpose | Upload PDF/Word templates, place eSign fields, use in **document rules** and transactions |

**Same thing elsewhere?**

- Per-transaction **Stored Documents** are tied to one project.
- **Settings → Formatting Rules** references vault files for checklist rules.

**Suggestions**

1. **Clarify with senior:** Template library vs “any file storage.”
2. If she wants general non-transaction storage:
   - Rename/subtitle Documents page to reduce confusion (“eSign template library”).
   - Add separate **File library** for brochures, instructions, videos (feeds task “Instructions here” links).
3. Document in onboarding: Documents tab = templates for rules/eSign, not client file folders.

---

### Q8. Create folders of documents and share links with third parties (temporary ~3 months)

| | |
|---|---|
| **Status** | **Not done** |
| **Answer** | **Folders exist per transaction; no public share links or expiry.** |

**Where in the app**

| What | Location |
|------|----------|
| Folders | `project_folders` per project; UI in Stored Documents |
| Public share | **None** — no token URL, no external viewer, no auto-expiry |

**Same thing elsewhere?**

- Disclosure link on property (`disclosureLink` field) is a **manual URL** field — not system-generated sharing.
- Glide/Drive links in Compass workflow are external (manual tasks).

**Suggestions**

1. New feature: **Shared folder links**
   - `share_links` table: `folder_id`, `token`, `expires_at`, `created_by`, optional password
   - Public read-only page: list + download files
   - Default expiry: **90 days** (per senior note)
   - Revoke link from Stored Documents UI
2. Use cases: signed disclosures to other agent/TC; end-of-file client copy
3. Security: signed URLs, rate limit, audit log, HTTPS only

---

## Tasks

### Q9. When a task step is to send a specific email, can that step link directly to that email template? (Like Email Timeline)

| | |
|---|---|
| **Status** | **Done** (manual setup) |
| **Answer** | **Yes** — email-type tasks with template + compose button. |

**Where in the app**

| What | Location |
|------|----------|
| Task type | `project_task_type` enum: `general` \| `email` (migration V042) |
| Fields | `email_template_id`, `recipient_email` on `project_tasks` |
| UI | `TransactionTasksTab.tsx` — create/edit email task; **Mail** icon → compose |
| Compose handler | `ProjectDetailPage.tsx` → `handleComposeEmailTask()` |
| Backend | `projectsService.ts` → `createProjectTask` / `updateProjectTask` |

**Same thing elsewhere?**

- **Email Timeline** uses the same pattern: template + prefill + open Emails compose.
- Compass task lists (`Task List - Buyer Files/Listings (Compass).pdf`) are **not auto-imported** — tasks must be created and linked manually unless templates are seeded.

**Suggestions**

1. Import Compass PDFs as **default task templates** with `task_type=email` and pre-linked `email_template_id`.
2. Show template name on task row for clarity.
3. Allow changing template from task row without full edit dialog.

---

### Q10. On the task list, link a task to a document and possibly a video (task instructions)

| | |
|---|---|
| **Status** | **Not done** |
| **Answer** | **No instruction doc or video link on tasks.** |

**Where in the app**

| What | Location |
|------|----------|
| Task fields today | title, stage, status, due_date, task_type, email_template_id, recipient_email, notes |
| Task notes | `project_task_notes` — timestamped text only (`TransactionTasksTab.tsx`) |
| Compass PDFs | Many lines say “Instructions here” — not wired in app |

**Same thing elsewhere?**

- **Task notes** can hold a pasted URL but no structured “open instructions” button.
- **Document vault** could host instruction PDFs but tasks don’t link to them.

**Suggestions**

1. DB migration: add to `project_tasks`:
   - `instruction_stored_file_id` (optional)
   - `instruction_url` (optional — video, Loom, Drive)
   - `instruction_label` (e.g. “Open instructions”)
2. UI: **View instructions** button on task row (opens file or URL).
3. When seeding Compass tasks, map each “Instructions here” to vault file or URL.
4. Optional: embed video preview in task detail drawer.

---

## Checklist

### Q11. Type timestamped notes next to each document on the document checklist. Is it going to be added in the next phase?

| | |
|---|---|
| **Status** | **Done** |
| **Answer** | **Already implemented** — may not have been visible on an older prototype build. |

**Where in the app**

| What | Location |
|------|----------|
| UI | Transaction → **Document Checklist** tab → message/notes icon per row |
| Component | `DocumentChecklistNotesPopover.tsx` |
| Also used in | `DocumentChecklistRowCard.tsx`, `TransactionDocumentsWorkspace.tsx` |
| API | `createProjectDocumentNoteApi`, `updateProjectDocumentNoteApi`, `deleteProjectDocumentNoteApi` |
| DB | `project_document_notes` |

**Same thing elsewhere?**

- **Task notes** (`project_task_notes`) — same timestamped pattern but for tasks, not checklist rows.

**Suggestions**

1. **Demo to senior:** Document Checklist → click notes icon on any row.
2. **UI polish:** Add visible “Notes” label or badge count on row (count already supported: `notesCount`).
3. **No new build required** unless she wants notes inline on the row instead of popover.

---

## Summary matrix

| # | Topic | Status | Primary location |
|---|--------|--------|------------------|
| 1 | Timeline PDF on email | Partial | Text via `{{timeline_table}}`; PDF separate |
| 2 | Two timeline email buttons | Not done | One button in Timeline tab |
| 3 | Save email drafts | Partial | Reminder drafts only |
| 4 | Schedule email send | Not done | — |
| 5 | Email from folder | Not done | Stored Documents |
| 6 | Attach doc to email | Not done | Schema only |
| 7 | Docs without transaction | Partial | `/documents` = eSign vault |
| 8 | Share folder links (3 mo) | Not done | — |
| 9 | Task → email template | Done | Tasks tab, email task type |
| 10 | Task → doc/video instructions | Not done | — |
| 11 | Checklist timestamped notes | Done | Document Checklist |

---

## Recommended implementation phases

### Phase A — Quick wins & clarity (low effort)

- Demo checklist notes (Q11) and email tasks (Q9) to senior.
- Add helper text on Timeline tab explaining text vs PDF (Q1).
- Rename Documents page subtitle to clarify eSign template library (Q7).

### Phase B — Timeline & email core (medium)

- Two timeline templates + two buttons (Q2).
- Email attachments API + compose UI (Q6).
- Email from Stored Documents (Q5).
- Save email drafts (Q3).

### Phase C — Tasks & Compass workflow (medium–large)

- Task instruction doc/URL fields (Q10).
- Import Compass Buyer/Listing task lists with sections and template links (extends Q9).

### Phase D — Sharing & scheduling (large)

- Share folder links with 90-day expiry (Q8).
- Scheduled send (Q4).
- Optional timeline PDF attachment on send (Q1).

---

## Related files (not in Questions PDF)

| File | Relevance |
|------|-----------|
| `Docs/Task List - Buyer Files (Compass).pdf` | Default buyer task seeding — separate scope |
| `Docs/Task List - Listings (Compass).pdf` | Default listing task seeding — separate scope |
| `Docs/List of Edits - 6_4_26-1.pdf` | Prior work — completed |

---

## Notes for demo / senior call

1. **Already done:** Checklist notes, email-type tasks, Email Timeline (text), Print PDF, CRM Documents vault.
2. **Not done:** Second timeline button, attachments, drafts (general), schedule send, share links, task instructions.
3. **Biggest next chunk:** Compass task list import + email/attachment improvements from Phase B.
