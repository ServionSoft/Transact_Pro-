# List of Edits — 7/18/26
## Solutions, Decisions & User Guide

**Purpose:** How each edit was handled, what we left unchanged (and why), and where to find / how to use the new behavior in the CRM.

**Source:** `Docs/List of Edits - 7_18_26 .pdf`

**Related:** Earlier solutions — `Docs/List-of-Edits-7-11-26-Solutions.md`

---

## How to read this doc

| Label | Meaning |
|--------|---------|
| **Done** | Implemented as requested (or agreed design) |
| **Left as-is** | Intentionally not changed further |
| **Partial** | Mostly done; remaining piece explained |
| **N/A** | Thank-you / note only — no new work |

---

# 1. Role (Type of Contact)

### 1.1 Combine Buyer + Seller → Buyer/Seller

**Status:** Done

**What we did:** Contacts use one type **Buyer/Seller**. Legacy `Buyer` / `Seller` remapped on load/display.

### Where / how to use

1. **Contacts** → Add or Edit.
2. **Type of Contact** → choose **Buyer/Seller**.
3. On a transaction, deal role is still the party slot (Buyer vs Seller section), not this type.

---

### 1.2 Combine team members → Agent Team Member/Assistant

**Status:** Done

**What we did:** One type **Agent Team Member/Assistant** (Listing + Buyer’s Agent team combined). Legacy labels remapped.

### Where / how to use

1. **Contacts** → Type of Contact → **Agent Team Member/Assistant**.
2. On New Transaction, still pick the correct party section (Listing vs Buyer’s Agent assistant slot).

---

### 1.3 Agent already combined

**Status:** Done (pre-7/18)

**What we did:** Listing Agent + Buyer’s Agent already share type **Agent**.

**Left as-is:** Transaction UI still has separate **Listing Agent** / **Buyer’s Agent** party blocks (deal slots).

**Why:** Type = who they are; slot = which side of this deal.

---

# 2. Agent input fields order

**Status:** Done

**What we did:** Reordered Agent form so related fields sit together:

| Pair | Layout |
|------|--------|
| Preferred name + License number | Side by side |
| Type of Contact + Status | Side by side |
| Brokerage name + Brokerage license number | Side by side |

### Where / how to use

**Contacts** → Add/Edit → Type **Agent** → fields appear in that order.

---

# 3. Agent Logo

**Status:** N/A

**What we did:** Already shipped earlier. Kathryn’s note was thank-you only.

### Where / how to use

**Contacts** → Agent → upload **Logo** on the contact record.

---

# 4. TC input fields (notes)

**Status:** N/A

**What we did:** Notes already available on non-Agent contacts. Thank-you only.

### Where / how to use

**Contacts** → pick type (e.g. TC) → use **Notes**.

---

# 5. New Transaction — incomplete fields

**Status:** Done

**What we did:** Soft blank vs filled styling on the New Transaction form:

| State | Look |
|-------|------|
| Empty | Dashed orange outline |
| Filled | Green outline |
| Required incomplete | Amber |
| Error | Red |

Legend under the step bar: **Filled · Blank · Required**.

**Left as-is:** Preferred Name / Notes stay calm (no empty highlight) so the form is not noisy.

### Where / how to use

1. **New Transaction** (or Edit).
2. Scan for orange dashed fields = still blank.
3. Fill as info arrives; green = done for that field.

---

# 6. TIMELINE

### 6.1 Waived on 7 Contingency Removals

**Status:** Done

**What we did:** Status options for the 7 contingency lines: **Date | Completed | N/A | Waived**. Bulk **Waive all Contingency Removals** with confirm.

### Where / how to use

1. Timeline (New Transaction or transaction **Timeline** tab).
2. Open a Contingency Removal row → choose **Waived**, or use bulk waive.

---

### 6.2 Contract / Acceptance not bumped

**Status:** Done

**What we did:** **Contract Date** and **Acceptance Date** can land on weekends/holidays. Other deadlines and COE still bump to business days.

### Where / how to use

Enter Contract/Acceptance as the real calendar day — they will not auto-move.

---

### 6.3 Asterisk for bumped dates

**Status:** Left as-is

**What we did:** Did not add a full “moved for weekend/holiday” asterisk on every bumped date.

**Why:** Kathryn said it may not be necessary; a solid flag needs a persisted “was bumped” mark. Partial offset-derived asterisk was optional and not required to ship.

---

### 6.4 Print PDF → back to Timeline

**Status:** Done

**What we did:** Print PDF **Back** / **Open** returns to the transaction **Timeline** tab (not Overview).

### Where / how to use

1. Transaction → Timeline → Print PDF.
2. Click **Back** (or Open) → lands on Timeline.

---

### 6.5 Clean Timeline view + Edit button

**Status:** Left as-is

**What we did:** Kept the full Timeline editor on the Timeline tab (same as input).

**Why:** Agreed to skip a separate “PDF-like read-only + Edit” mode for now to avoid dual UIs. Print PDF remains the clean printable view.

### Where / how to use

- **Timeline tab** = edit dates/status.
- **Print PDF** = clean printable list.

---

# 7. REVIEW AND SAVE

### 7.1 Soft required fields to create

**Status:** Done

**What we did:** Create only needs:

- Type
- Primary Contact
- Address
- Next Step
- Next Step Date

Timeline dates (Contract, Acceptance, Preapproval, Loan CR, COE) and Purchase Price are **not** required to open a file. Add them later when known.

**Left as-is:** Soft Create Option A (price optional; listing post-contract same soft timeline rules).

### Where / how to use

1. Fill the five create fields → **Create**.
2. Edit the transaction later to add timeline / price / parties as info arrives.

---

### 7.2 Save blocked at 12/12 with nothing listed

**Status:** Partial

**What we did:** Soft timeline/price rules fixed the common “timeline blocking create” case.

**Left as-is / remaining:** If **format** errors still block Create (invalid ZIP, email format, etc.), the UI may not always list them clearly next to the 12/12 counter.

**Why:** Required-item counter ≠ format validation. Optional polish: surface format errors when Create is disabled.

---

# 8. Formatting (dates & money)

### 8.1 Dates as MM/DD/YYYY

**Status:** Done

**What we did:** Display helper formats dates as **MM/DD/YYYY**. Storage stays ISO (`YYYY-MM-DD`).

Wired on: Timeline, Review, Overview, lists, Next Steps, Dashboard deadlines, etc.

### Where / how to use

No special action — dates show as `07/21/2026` in the UI. Pickers still use ISO under the hood.

---

### 8.2 Purchase Price as $ amount

**Status:** Done

**What we did:**

- Form: `$` prefix beside the input
- Review / Overview: `$1,250,000`-style display
- Storage: digits only (no `$` in DB)

**Left as-is:** Some **list price** chips on cards/kanban/header may still show raw numbers.

**Why:** Kathryn’s ask was Purchase Price formatting; list surfaces are optional polish.

### Where / how to use

New Transaction → Transaction Details → Purchase Price (`$` + number).

---

# 9. PARTIES

### 9.1 Listing Agent email optional (save without email)

**Status:** Done

**What we did:** Email is **optional** for all contact types (format checked only if entered). Lender still omits email by design.

### Where / how to use

1. New Buyer file → Listing Agent → **New contact**.
2. Save with name/preferred only; add email later via **Contacts** → Edit.

**Note:** Typing email only on the transaction party row does **not** update the Contacts record — edit the contact for reuse.

---

### 9.2 Contacts start collapsed

**Status:** Done

**What we did:** Party sections on New Transaction start **collapsed**. Expand a header when ready to fill.

### Where / how to use

New Transaction → Parties → click a section title (Listing Agent, Escrow, etc.) to expand.

---

# 10. PROPERTY / TRANSACTION DETAILS

### 10.1 SPBB %

**Status:** Done

**What we did:**

- UI: `%` suffix (like `$` on price)
- Input: decimals allowed (`2.5`)
- Storage: plain number `2.5` (no `%` in metadata)
- Display: `2.5%` on Overview/Review

**Why store `2.5`:** Same as price without `$` — calculations use `parseFloat(spbbPct) / 100`.

### Where / how to use

Transaction Details → **SPBB** → type `2.5` (suffix shows `%`).

---

### 10.2 Square Feet & Lot Size (numbers + letters)

**Status:** Done

**What we did:** Free text — numbers, letters, units allowed (e.g. `2,450 sq ft`, `0.25 acres`). Stored as strings in `metadata_json`.

**Left as-is:** No word-to-number conversion (“twenty five” → 25).

**Why:** Kathryn asked for letters/units with numbers, not spoken-word parsing. JSONB string storage is safe.

### Where / how to use

Property Details → Square Feet / Lot Size → type freely.

---

# Summary scoreboard

| Area | Outcome |
|------|---------|
| Role combines | Done |
| Agent field order | Done |
| Logo / TC notes | N/A (thanks) |
| Blank vs filled fields | Done |
| Timeline Waived + no bump Contract/Acceptance | Done |
| Asterisk for bumps | Left as-is |
| PDF back to Timeline | Done |
| Clean Timeline + Edit | Left as-is |
| Soft Create | Done |
| 12/12 format-error UX | Partial |
| Dates MM/DD/YYYY | Done |
| Purchase Price $ | Done |
| Optional agent email | Done |
| Parties collapsed | Done |
| SPBB % | Done |
| Sq Ft / Lot Size free text | Done |

---

# Process note (from Kathryn’s email)

| Who | Cadence |
|-----|---------|
| Kathryn sends edits | Thursday midnight EST |
| Hasan returns revisions | Monday midnight EST |

Confirm schedule in email reply (process only — not a code item).
