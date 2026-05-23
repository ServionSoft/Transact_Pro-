/**
 * Load document rule rows from backend/seeds/*.csv (exported from Checklist Automation_.xlsx).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(__dirname, "../seeds");

export const DOCUMENT_SET_LISTING_ID = 10001;
export const DOCUMENT_SET_BUYER_ID = 10002;

export const BUYER_SECTIONS = new Set([
  "Buyer Inspection Reports",
  "Other In-Escrow Disclosures and Reports",
  "Contingencies",
  "Final Contract Documents",
]);

export type CsvRuleRow = {
  rowType: string;
  ruleId: number | null;
  ruleName: string;
  kind: string;
  triggerField: string;
  triggerValue: string;
  transactionType: string;
  section: string;
  documentName: string;
  required: boolean;
  action: string;
  note: string;
  vaultFilename: string;
};

export type StandardDocRow = {
  mockId: string;
  section: string;
  name: string;
  required: boolean;
  note?: string;
  vaultFilename: string;
};

export type ActionSeed = {
  id: string;
  documentName: string;
  action: "add-required" | "add-optional" | "mark-na";
  note?: string;
  vaultFilename: string;
};

export type ConditionalRuleSeed = {
  id: number;
  name: string;
  kind: "standard" | "conditional";
  triggers: { field: string; value: string }[];
  actions: ActionSeed[];
  transactionType: "listing" | "buyer_file" | null;
  documents: Array<{
    id: string;
    name: string;
    required: boolean;
    section?: string;
    note?: string;
    vaultFilename: string;
  }>;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsvFile(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function parseBool(raw: string, defaultValue = true): boolean {
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return defaultValue;
}

function parseRuleRow(raw: Record<string, string>): CsvRuleRow {
  const ruleIdRaw = raw.rule_id?.trim();
  return {
    rowType: raw.row_type ?? "",
    ruleId: ruleIdRaw && /^\d+$/.test(ruleIdRaw) ? Number(ruleIdRaw) : null,
    ruleName: raw.rule_name ?? "",
    kind: raw.kind ?? "",
    triggerField: raw.trigger_field ?? "",
    triggerValue: raw.trigger_value ?? "",
    transactionType: raw.transaction_type ?? "",
    section: raw.section ?? "",
    documentName: raw.document_name ?? "",
    required: parseBool(raw.required ?? "true"),
    action: raw.action ?? "",
    note: raw.note ?? "",
    vaultFilename: raw.vault_filename ?? "",
  };
}

export function loadVaultTemplateMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const raw of readCsvFile(path.join(SEEDS_DIR, "vault-template-map.csv"))) {
    const docName = raw.document_name?.trim();
    const vault = raw.vault_filename?.trim();
    if (docName && vault) map.set(docName.toLowerCase(), vault);
  }
  return map;
}

function resolveVaultFilename(docName: string, rowVault: string, vaultMap: Map<string, string>): string {
  if (rowVault.trim()) return rowVault.trim();
  const mapped = vaultMap.get(docName.toLowerCase());
  if (mapped) return mapped;
  return docName.trim();
}

export function loadChecklistFromCsv(): {
  listingRows: StandardDocRow[];
  buyerRows: StandardDocRow[];
  rules: ConditionalRuleSeed[];
} {
  const vaultMap = loadVaultTemplateMap();
  const csvPath = path.join(SEEDS_DIR, "document-rules.csv");
  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `Missing ${csvPath}. Run: python backend/scripts/export_checklist_from_excel.py`
    );
  }

  const parsed = readCsvFile(csvPath).map(parseRuleRow);
  const listingRows: StandardDocRow[] = [];
  let listingIdx = 0;

  for (const row of parsed) {
    if (row.rowType !== "standard_doc") continue;
    listingIdx += 1;
    listingRows.push({
      mockId: `xl${listingIdx}`,
      section: row.section,
      name: row.documentName,
      required: row.required,
      note: row.note || undefined,
      vaultFilename: resolveVaultFilename(row.documentName, row.vaultFilename, vaultMap),
    });
  }

  const buyerRows = listingRows.filter((r) => BUYER_SECTIONS.has(r.section));

  const rulesById = new Map<number, ConditionalRuleSeed>();

  for (const row of parsed) {
    if (row.rowType === "standard_doc" && row.ruleId != null) {
      let rule = rulesById.get(row.ruleId);
      if (!rule) {
        const tx =
          row.transactionType === "listing"
            ? "listing"
            : row.transactionType === "buyer_file"
              ? "buyer_file"
              : null;
        rule = {
          id: row.ruleId,
          name: row.ruleName || (row.ruleId === 10011 ? "Standard Listing Checklist" : "Standard Buyer File Checklist"),
          kind: "standard",
          triggers: [{ field: row.triggerField, value: row.triggerValue }],
          actions: [],
          transactionType: tx,
          documents: [],
        };
        rulesById.set(row.ruleId, rule);
      }
      rule.documents.push({
        id: `slot-${row.ruleId}-${rule.documents.length + 1}`,
        name: row.documentName,
        required: row.required,
        section: row.section || undefined,
        note: row.note || undefined,
        vaultFilename: resolveVaultFilename(row.documentName, row.vaultFilename, vaultMap),
      });
    }

    if (row.rowType === "conditional_action" && row.ruleId != null) {
      let rule = rulesById.get(row.ruleId);
      if (!rule) {
        rule = {
          id: row.ruleId,
          name: row.ruleName,
          kind: "conditional",
          triggers: [{ field: row.triggerField, value: row.triggerValue }],
          actions: [],
          transactionType: null,
          documents: [],
        };
        rulesById.set(row.ruleId, rule);
      }
      const action = (row.action || "add-required") as ActionSeed["action"];
      rule.actions.push({
        id: `act-${row.ruleId}-${rule.actions.length + 1}`,
        documentName: row.documentName,
        action,
        note: row.note || undefined,
        vaultFilename: resolveVaultFilename(row.documentName, row.vaultFilename, vaultMap),
      });
    }
  }

  // Standard buyer rule documents from buyer sections
  rulesById.set(10012, {
    id: 10012,
    name: "Standard Buyer File Checklist",
    kind: "standard",
    triggers: [{ field: "transactionType", value: "Buyer File" }],
    actions: [],
    transactionType: "buyer_file",
    documents: buyerRows.map((r, i) => ({
      id: `slot-10012-${i + 1}`,
      name: r.name,
      required: r.required,
      section: r.section,
      note: r.note,
      vaultFilename: r.vaultFilename,
    })),
  });

  const rules = [...rulesById.values()].sort((a, b) => a.id - b.id);
  return { listingRows, buyerRows, rules };
}

export function typeCodeFromMockId(mockId: string): string {
  return `dt_${mockId}`.slice(0, 64);
}

export function typeCodeFromAction(a: ActionSeed): string {
  return `dt_act_${a.id}`.slice(0, 64);
}
