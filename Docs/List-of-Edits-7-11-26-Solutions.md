# List of Edits — 7/11/26
## Solutions, Decisions & User Guide

**Purpose:** How each edit was handled, what we left unchanged (and why), and where to find / how to use the new behavior in the CRM.

**Source:** `Docs/List of Edits - 7_11_26 .pdf`

---

## How to read this doc

| Label | Meaning |
|--------|---------|
| **Done** | Implemented as requested (or agreed design) |
| **Left as-is** | Intentionally not changed further |
| **Partial** | Mostly done; remaining piece explained |

---

# 1. New Transaction button

**Status:** Done

**What we did:** New Transaction is available from Dashboard and Next Steps (not only Transactions).

### Where / how to use

1. Open **Dashboard** or **Next Steps** in the left sidebar.
2. Click **New transaction**.
3. Complete the wizard (General → Parties → … → Review + Save).

---

# 2. Address

### 2.1 Autopopulate keeps only street name after select

**Status:** Done

**What we did:** Choosing a suggestion fills the full street line plus City / State / ZIP (and County when available). Manual typing was already fine.

### Where / how to use

1. **New Transaction** (or Edit) → **General**.
2. Start typing in **Property Address**.
3. Click a Google suggestion — street, city, state, ZIP should fill correctly.

---

### 2.2 Separate City, State, ZIP

**Status:** Done

**What we did:** Address is split: street on one line; **City**, **State**, **ZIP**, **County** are separate fields (Address/General area — not duplicated in Property Details).

### Where / how to use

Same **General** section. Edit any part after autopopulate if needed.

---

### 2.3 Street # + street name for email subject

**Status:** Done (street line used for subject tokens)

**What we did:** Templates can use the street portion of the address (not the full “City, State, ZIP” blob).

### Where / how to use

1. Open a transaction → **Emails** → compose / pick a template.
2. Subject tokens that use the street address pull from the saved street field.

---

### 2.4 Are fields saved individually?

**Status:** Partial

**What we did:** City, State, ZIP, County, and street are stored separately.

**Left as-is:** Street number and street name are **one** street field (not split into two DB columns).

**Why:** Enough for email subjects and forms; full parse of “number vs name” adds complexity for little gain now.

---

# 3. Role → Type of Contact

**Status:** Done

**What we did:** Contact “Role” is treated as **Type of Contact** with broader options (e.g. Agent instead of only Listing/Buyer Agent; expanded TC / Escrow / Lender / Team types). Legacy types remapped so old contacts still open.

### Where / how to use

1. **Contacts** → **Add** or **Edit**.
2. Choose **Type of Contact**.
3. Form fields change based on that type (see §6).

---

# 4. Preferred Name

**Status:** Done

**What we did:** Preferred Name is **required**. Blank preferred name blocks save. We do **not** auto-fill from First Name.

**Why:** Email templates need a reliable preferred name.

### Where / how to use

1. Contacts → Add/Edit → fill **Preferred Name** before Save.
2. Same rule when creating a contact from a **Parties** / link picker.

---

# 5. Contact Name (First / Last)

**Status:** Done

**What we did:** Separate **First Name** and **Last Name**. Database keeps a combined `name` plus `first_name` / `last_name` for templates and lists.

### Where / how to use

Contacts form → enter First + Last + Preferred → Save.

---

# 6. Contact input fields (by type)

**Status:** Done

**What we did:** Contacts form is dynamic by type. Extra fields live in `details` (JSONB). Examples:

| Type | Extra fields |
|------|----------------|
| Agent | License, brokerage, brokerage license, notes, **logo** |
| Escrow Officer | Company, address, **assistants roster** |
| TC / Seller / Buyer / Team | Core + email + phone |
| Lender | Company only — **no email / phone** (safety) |

**Left as-is:** Agent **logo** on the Contact record (not as a separate upload on every party row).

**Why:** Contacts is the source of truth; parties link to contacts.

### Where / how to use

1. **Contacts** → Add/Edit.
2. Pick type → fill shown fields.
3. **Agent:** upload logo if needed.
4. **Escrow Officer:** add one or more assistants on that contact (see §10).

---

# 7. Multiple buyers or sellers

**Status:** Done

**What we did:** Cap raised from **4 → 10**.

**Left as-is:** Not unlimited.

**Why:** Unlimited lists get hard to scan; 10 covers rare multi-party deals.

### Where / how to use

1. New/Edit Transaction → **Parties**.
2. Use **+** to add buyers/sellers until the `/10` limit.

---

# 8. Primary Contact

**Status:** Done (Option A — keep Primary Contact + autopopulate)

**What we did:**

- Listing file: first **Listing Agent** ↔ Primary Contact.
- Buyer file: first **Buyer’s Agent** ↔ Primary Contact.
- Works both ways (agent → primary, or primary → empty agent slot).

**Left as-is:** Primary Contact field **not removed**.

**Why:** Still useful as the deal’s linked contact; autopopulate removes double typing.

### Where / how to use

1. **General** sidebar → set **Primary Contact**, **or**
2. **Parties** → link the lead agent.
3. Watch the other side fill automatically when empty.

---

# 9. New Transaction in-progress (don’t lose work)

**Status:** Done

**What we did:** Form autosaves a **local browser draft**. Return and **Restore** or **Discard**. Draft clears after successful create.

**Left as-is:** Draft is **device/browser local** (not synced to another computer).

**Why:** Fast and no backend draft system; matches “pulled away mid-entry.”

### Where / how to use

1. Start **New Transaction**, fill some fields.
2. Navigate away.
3. Open **New Transaction** again → banner → **Restore** or **Discard**.

---

# 10. Escrow Assistant

**Status:** Done (Solution A)

**What we did:** Escrow assistants belong on the **Escrow Officer** contact (roster). On a deal, choose which assistant works that file from a **dropdown** (first auto-fills; others selectable).

**Left as-is:** Not “always invent a brand-new assistant contact per deal with no roster.”

**Why:** One officer often has several assistants; the deal still needs **one** active assistant for email.

### Where / how to use

**Setup (Contacts)**

1. Contacts → Escrow Officer → add assistant rows (first / last / preferred / email).
2. Save.

**On a transaction**

1. Parties → Escrow Officer (link contact).
2. Escrow Assistant section → pick assistant from the officer’s list (or confirm the autofill).

---

# 11. Parties input

**Status:** Done

**What we did:**

- Required + optional party types present (including **Listing Agent Assistant/Team Member** on Buyer files).
- First / last name on parties.
- Field sets per role (Agent licenses/brokerage, TC phone, Escrow address + assistant, Lender **no email**, etc.).

### Where / how to use

1. New/Edit Transaction → **Parties**.
2. Use **Link contact** or fill inline.
3. Optional parties via **+** (Agent 2, Team Member, Lender, etc.).

---

# 12. Property Details

| Edit | Status | What we did |
|------|--------|-------------|
| Remove City / State / ZIP here | Done | Only under Address/General |
| Square Feet before Lot Size | Done | Reordered |
| Propane yes/no | Done | New field + rules context |
| De-select yes/no | Done | Click the same Yes or No again to clear |

### Where / how to use

1. New/Edit Transaction → **Property Details**.
2. Enter Sq Ft, then Lot Size.
3. Set **Propane**.
4. To clear a mistaken Yes/No: click the **same** answer again.

---

# 13. Timeline

| Edit | Status | What we did |
|------|--------|-------------|
| Completed / N/A | Done | **Status** column: Date \| Completed \| N/A |
| Estimated COE order | Done | Below Verification of Property Condition, above Possession |
| PDF footer note | Done | Weekend/holiday business-day note on print + PDF |
| Asterisk on bumped dates | Partial | `*` when an **offset-derived** date moves for weekend/holiday; US federal holidays; Sat bumps **forward** to Mon |
| Auto-attach timeline PDF | Done | Email timeline attaches PDF automatically |

**Left as-is:**

- Asterisk does **not** flag every manually typed bumped date (original day isn’t stored).
- Completed / N/A stored in metadata (no new “status” column on `project_deadlines`). Both remove that milestone from the deadline calendar sync.

**Why:** Matches current design; calendar stays clean. Optional later: mark Completed with `is_completed = true` and keep the row.

### Where / how to use

1. Open transaction → **Timeline** tab.
2. Per milestone: **Status** (Date / Completed / N/A) + **Date / Value**.
3. **Print PDF** — download / print with footer note.
4. **Email timeline** — opens Emails composer with timeline in the body **and PDF attached**. Wait for “Preparing…” then Send.
5. After deploy: restart backend so Completed/N/A **saves** on existing deals.

---

# 14. Review and Save (incomplete form)

**Status:** Left as-is (by design)

**PDF asked:** Save even when fields are missing.

**Our decision:** Required fields are already minimized. We will **not** soften Create further.

| File type | Minimum to Create (approx.) |
|-----------|-----------------------------|
| Listing | Primary Contact, Property Address, Next Step, Next Step Date |
| Buyer File | Above + purchase/timeline core dates (price, contract/acceptance, preapproval, COE, loan contingency, etc.) |

**Why:** Empty deals break Next Steps, emails, and buyer timelines. Mid-entry is covered by **draft restore** (§9), not by saving incomplete transactions to the DB.

### Where / how to use

1. Fill required fields (footer / gold borders show what’s missing).
2. Click **Create Transaction**.
3. Or leave mid-form and **Restore** draft later (§9).

---

# 15. Next Steps page

**Status:** Done

**What we did:**

- Removed **Contact** and **Docs** columns (Contact name still under Property on small screens).
- Wider **Next Step** column.
- **Next Step Date** as its own column.
- Click column headers to sort.
- Default sort: **Next Step Date**, earliest first (empty dates last). Overdue stays red; no overdue/today bucket groups.

### Where / how to use

1. Sidebar → **Next Steps**.
2. Click a heading (e.g. **Next step date**) to sort; click again to reverse.
3. Click a row to open the transaction.
4. Row menu (⋮) for actions / edit next step when available.

---

# 16. Stored Documents

**Status:** Guidance (question in PDF, not a “missing column” edit)

### Where / how to use

1. Open a transaction → **Stored Documents**.
2. Create or open a **folder**.
3. Upload files into that folder.
4. Use move/rename/delete as provided in that workspace.

*(If upload fails in your environment, treat as a support/API issue — not the same as “feature missing.”)*

---

# CRM improvements (summary for handoff)

1. **Contacts** match real TCs: types, required preferred name, first/last, logos, escrow assistants.
2. **Deal entry** is safer and faster: address fix, draft autosave, party fields, primary↔agent sync.
3. **Timeline** is client-ready: status, order, holidays, PDF footer, email with PDF attached.
4. **Next Steps** focuses on work due: step + date, sortable, earliest first.
5. **Draft restore** covers long data-entry sessions without weakening Create validation.

---

# Intentionally left unchanged (quick list)

| Item | Why |
|------|-----|
| Street # vs street name not fully split | Combined street + city/state/zip is enough |
| Primary Contact kept | Autopopulate removes double work; still useful |
| Buyers/sellers max 10 | Rare edge; unlimited UI is worse |
| Soft Create with missing required fields | Already minimized; draft covers mid-entry |
| Timeline `*` only on offset bumps | Manual originals not stored |
| Completed calendar = drop row (same as N/A) | Keeps calendar clean |
| Draft only in browser | Simple local autosave |

---

**End of document**
