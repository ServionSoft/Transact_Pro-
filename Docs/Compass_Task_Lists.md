# Compass Task Lists — Implementation

**Source PDFs:** `Task List - Listings (Compass).pdf`, `Task List - Buyer Files (Compass).pdf`

## Behavior

| Transaction | When tasks seed | Phases |
|-------------|-----------------|--------|
| **Buyer File** | On create | All 37 Compass buyer tasks |
| **Listing** | On create | 20 pre-contract tasks (New Listing + Seller Disclosure Packet) |
| **Listing** | On edit when **Contract accepted** is checked | 28 post-contract tasks (Timeline, Business Tracker, Closing, etc.) |

Seeding is **idempotent** — each task has a stable `template_item_key`; re-saving does not duplicate.

## Database

- **V045** — `project_tasks`: `task_section`, `sort_order`, `instruction_url`, `template_item_key`
- **V046** — `email_templates.template_key` + Compass email templates
- **V047** — **repair** (idempotent re-apply if V045/V046 are marked applied but columns missing)

Run migrations on staging/prod before deploy:

```bash
cd backend && npm run db:migrate
```

If you see `skip V045` / `skip V046` but the API errors with `column "task_section" does not exist`, run migrate again — **V047** fixes that state.

**Local dev:** `npm run db:migrate` may target Render if `backend/.env.render` exists. The API uses **`backend/.env` only**. If migrations skipped but columns are missing on local Postgres:

```bash
cd backend && npm run db:repair:compass-tasks
```

Or apply all pending migrations to local only:

```bash
cd backend && npm run db:migrate:local
```

## Code

| Area | Path |
|------|------|
| Task definitions | `backend/src/data/compassTaskTemplates.ts` |
| Seed service | `backend/src/services/compassTaskSeedService.ts` |
| Hooks | `createProject` / `updateProject` in `projectsService.ts` |
| Tasks UI sections | `TransactionTasksTab.tsx`, `lib/taskSectionGroups.ts` |

## UI

- **Tasks** tab groups rows by section (e.g. New Listing, Timeline, Closing).
- **Email** tasks show Mail icon → opens compose with linked template.
- **Instructions** tasks show external-link icon (placeholder URLs until Kathryn provides real links).

## Email template keys

| Key | Template name |
|-----|----------------|
| `timeline_parties` | Transaction Timeline |
| `timeline_client` | Transaction Timeline — Client |
| `notes_questions_ba` | Notes and Questions — Buyer's Agent |
| `buyer_signed_docs_la_tc` | Buyer Signed Docs to LA/TC |
| `listing_questions_agent` | Listing Questions to Agent |
| `listing_disclosure_intro_client` | Listing Disclosure Intro — Client |
| `listing_additional_disclosures_seller` | Additional Disclosures — Seller Review |
| `nhd_invoice_escrow` | NHD Invoice to Escrow |

## Next steps (after Kathryn review)

1. Replace placeholder instruction URLs with real Google Doc / vault links.
2. Add brokerage field (Sotheby's packs later).
3. Sync document checklists from her Gmail spreadsheet (separate scope).
