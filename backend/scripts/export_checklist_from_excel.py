"""
Export Docs/Checklist Automation_.xlsx -> backend/seeds/document-rules.csv

Run from repo root:
  python backend/scripts/export_checklist_from_excel.py
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

import openpyxl

REPO_ROOT = Path(__file__).resolve().parents[2]
XLSX = REPO_ROOT / "Docs" / "Checklist Automation_.xlsx"
OUT_CSV = REPO_ROOT / "backend" / "seeds" / "document-rules.csv"

BUYER_SECTIONS = {
    "Buyer Inspection Reports",
    "Other In-Escrow Disclosures and Reports",
    "Contingencies",
    "Final Contract Documents",
}

RULE_IDS = {
    "listing_standard": 10011,
    "buyer_standard": 10012,
    "exempt_seller": 10013,
    "hoa": 10014,
    "tenant": 10015,
    "vacant_land": 10016,
    "marin": 10017,
    "dual_agency": 10018,
}

CONDITIONAL_HEADER = re.compile(
    r'^(When\s|If HOA is|If Tenant Occupied|If property type|If County is|If Dual Agency)',
    re.I,
)

CONDITIONAL_TRIGGERS = [
    (re.compile(r"^When Exempt Seller", re.I), "exemptSeller", "Yes", "exempt_seller"),
    (re.compile(r"^If HOA is", re.I), "hoa", "Yes", "hoa"),
    (re.compile(r"^If Tenant Occupied", re.I), "tenantOccupied", "Yes", "tenant"),
    (re.compile(r"^If property type", re.I), "propertyType", "Vacant Land", "vacant_land"),
    (re.compile(r"^If County is Marin", re.I), "county", "Marin", "marin"),
    (re.compile(r"^If Dual Agency", re.I), "dualAgency", "Yes", "dual_agency"),
]

SECTION_HINTS = (
    "Documents",
    "Disclosures",
    "Reports",
    "Contingencies",
    "Questionnaires",
    "Contract",
)


def norm(value) -> str:
    if value is None:
        return ""
    return str(value).replace("\t", " ").strip()


def is_section_header(text: str) -> bool:
    if not text:
        return False
    if text.endswith(":"):
        return any(h in text for h in SECTION_HINTS)
    return text in (
        "Seller Disclosures - Questionnaires",
        "Seller Disclosures - Standard (not property specific)",
    )


def parse_trigger(raw: str) -> tuple[str, str, str]:
    for pattern, field, value, key in CONDITIONAL_TRIGGERS:
        if pattern.search(raw):
            return field, value, key
    return "unknown", raw, "unknown"


def parse_action(note: str) -> str:
    n = note.lower()
    if "n/a" in n or "removed" in n:
        return "mark-na"
    return "add-required"


def main() -> None:
    if not XLSX.is_file():
        raise SystemExit(f"Missing workbook: {XLSX}")

    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    rows = list(wb["Sheet1"].iter_rows(values_only=True))
    wb.close()

    standard_rows: list[dict] = []
    optional_rows: list[dict] = []
    conditionals: list[dict] = []

    cur_section = ""
    cur_rule: dict | None = None
    mode = "standard"

    for row in rows:
        cells = list(row) if row else []
        a = norm(cells[0]) if len(cells) > 0 else ""
        b = norm(cells[1]) if len(cells) > 1 else ""
        if not a:
            continue
        if a.startswith("If Applicable Documents") or a.startswith("VARIATIONS TO STANDARD"):
            mode = "optional"
            continue
        if a.startswith("If Document Status"):
            continue
        if CONDITIONAL_HEADER.match(a):
            mode = "conditional"
            if cur_rule:
                conditionals.append(cur_rule)
            field, value, key = parse_trigger(a)
            cur_rule = {
                "rule_key": key,
                "rule_name": a.rstrip(":"),
                "trigger_field": field,
                "trigger_value": value,
                "actions": [],
            }
            continue
        if a.startswith("*"):
            break
        if is_section_header(a):
            cur_section = a.rstrip(":").strip()
            continue
        if a == "Standard Document Checklist:":
            continue

        if mode == "standard":
            standard_rows.append(
                {
                    "section": cur_section,
                    "document_name": a,
                    "required": "true",
                    "note": b,
                }
            )
        elif mode == "optional":
            optional_rows.append(
                {
                    "section": b or "If Applicable",
                    "document_name": a,
                    "required": "false",
                    "note": b,
                }
            )
        elif mode == "conditional" and cur_rule:
            action = parse_action(b) if b else "add-required"
            cur_rule["actions"].append(
                {"document_name": a, "action": action, "note": b}
            )

    if cur_rule:
        conditionals.append(cur_rule)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "row_type",
                "rule_id",
                "rule_name",
                "kind",
                "trigger_field",
                "trigger_value",
                "transaction_type",
                "section",
                "document_name",
                "required",
                "action",
                "note",
                "vault_filename",
            ]
        )

        for idx, doc in enumerate(standard_rows):
            w.writerow(
                [
                    "standard_doc",
                    RULE_IDS["listing_standard"],
                    "Standard Listing Checklist",
                    "standard",
                    "transactionType",
                    "Listing",
                    "listing",
                    doc["section"],
                    doc["document_name"],
                    doc["required"],
                    "",
                    doc["note"],
                    "",
                ]
            )

        for doc in optional_rows:
            w.writerow(
                [
                    "optional_doc",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    doc["section"],
                    doc["document_name"],
                    doc["required"],
                    "",
                    doc["note"],
                    "",
                ]
            )

        for cr in conditionals:
            rid = RULE_IDS.get(cr["rule_key"], "")
            for act in cr["actions"]:
                w.writerow(
                    [
                        "conditional_action",
                        rid,
                        cr["rule_name"],
                        "conditional",
                        cr["trigger_field"],
                        cr["trigger_value"],
                        "",
                        "",
                        act["document_name"],
                        "",
                        act["action"],
                        act["note"],
                        "",
                    ]
                )

    print(f"Wrote {OUT_CSV}")
    print(f"  standard docs: {len(standard_rows)}")
    print(f"  optional docs: {len(optional_rows)}")
    print(f"  conditional rules: {len(conditionals)}")


if __name__ == "__main__":
    main()
