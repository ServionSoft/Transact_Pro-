import type { Pool } from "pg";

export type DocumentRuleRow = {
  id: string;
  name: string;
  required: boolean;
  section?: string;
  note?: string;
  storedFileId?: string;
};

export type RuleDocumentActionRow = {
  id: string;
  documentName: string;
  action: "add-required" | "add-optional" | "mark-na";
  note?: string;
  storedFileId?: string;
};

export type ConditionalRuleApiRow = {
  id: string;
  name: string;
  kind: "standard" | "conditional";
  triggers: { field: string; value: string }[];
  documents: DocumentRuleRow[];
  actions: RuleDocumentActionRow[];
  isActive: boolean;
  createdAt: string;
  /** UI / AddProject: "Listing" | "Buyer File" when derived from DB `transaction_type`. */
  transactionType?: string;
  propertyType?: string;
};

export type UpsertDocumentRuleInput = {
  name: string;
  kind: "standard" | "conditional";
  triggers: { field: string; value: string }[];
  documents: DocumentRuleRow[];
  actions: RuleDocumentActionRow[];
  isActive: boolean;
};

export type ValidationFailure = { status: number; code: string; message: string };

function parseTriggers(raw: unknown): { field: string; value: string }[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((t): t is { field: string; value: string } => {
      return (
        typeof t === "object" &&
        t !== null &&
        "field" in t &&
        "value" in t &&
        typeof (t as { field: unknown }).field === "string" &&
        typeof (t as { value: unknown }).value === "string"
      );
    });
  }
  return [];
}

function parseDocuments(raw: unknown): DocumentRuleRow[] {
  if (raw == null || !Array.isArray(raw)) return [];
  const out: DocumentRuleRow[] = [];
  for (const d of raw) {
    if (typeof d !== "object" || d === null) continue;
    const o = d as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : String(o.id ?? "");
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const required = Boolean(o.required);
    const section = typeof o.section === "string" ? o.section : undefined;
    const note = typeof o.note === "string" ? o.note : undefined;
    const storedFileId = typeof o.storedFileId === "string" ? o.storedFileId : undefined;
    if (id && name) out.push({ id, name, required, section, note, storedFileId });
  }
  return out;
}

function parseActions(raw: unknown): RuleDocumentActionRow[] {
  if (raw == null || !Array.isArray(raw)) return [];
  const out: RuleDocumentActionRow[] = [];
  for (const a of raw) {
    if (typeof a !== "object" || a === null) continue;
    const o = a as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : String(o.id ?? "");
    const documentName = typeof o.documentName === "string" ? o.documentName : "";
    const action = o.action;
    if (action !== "add-required" && action !== "add-optional" && action !== "mark-na") continue;
    const note = typeof o.note === "string" ? o.note : undefined;
    const storedFileId = typeof o.storedFileId === "string" ? o.storedFileId : undefined;
    if (id && documentName) out.push({ id, documentName, action, note, storedFileId });
  }
  return out;
}

function triggerFieldsUnique(triggers: { field: string; value: string }[]): boolean {
  const seen = new Set<string>();
  for (const t of triggers) {
    if (seen.has(t.field)) return false;
    seen.add(t.field);
  }
  return true;
}

function duplicateStoredFileIds(ids: (string | undefined)[]): boolean {
  const present = ids.filter((id): id is string => Boolean(id));
  return new Set(present).size !== present.length;
}

export function validateUpsertDocumentRule(input: UpsertDocumentRuleInput): ValidationFailure | null {
  const name = input.name?.trim() ?? "";
  if (!name) {
    return { status: 400, code: "RULE_NAME_REQUIRED", message: "Rule name is required." };
  }
  if (!input.triggers?.length) {
    return { status: 400, code: "RULE_TRIGGERS_REQUIRED", message: "Add at least one trigger condition." };
  }
  if (!triggerFieldsUnique(input.triggers)) {
    return {
      status: 400,
      code: "RULE_TRIGGER_FIELD_DUPLICATE",
      message: "Each trigger field can only appear once.",
    };
  }
  if (input.kind === "standard") {
    const docs = input.documents?.filter((d) => d.name?.trim()) ?? [];
    if (docs.length === 0) {
      return {
        status: 400,
        code: "RULE_DOCUMENTS_REQUIRED",
        message: "Add at least one baseline document.",
      };
    }
    if (duplicateStoredFileIds(docs.map((d) => d.storedFileId))) {
      return {
        status: 400,
        code: "RULE_DUPLICATE_STORED_FILE",
        message: "The same CRM library file cannot be used on more than one row.",
      };
    }
  } else {
    const acts = input.actions?.filter((a) => a.documentName?.trim()) ?? [];
    if (acts.length === 0) {
      return {
        status: 400,
        code: "RULE_ACTIONS_REQUIRED",
        message: "Add at least one document action.",
      };
    }
    if (duplicateStoredFileIds(acts.map((a) => a.storedFileId))) {
      return {
        status: 400,
        code: "RULE_DUPLICATE_STORED_FILE",
        message: "The same CRM library file cannot be used on more than one row.",
      };
    }
  }
  return null;
}

export async function isDocumentRuleNameTaken(
  pool: Pool,
  name: string,
  excludeId: string | null
): Promise<boolean> {
  const key = name.trim().toLowerCase();
  const { rows } = await pool.query<{ n: string }>(
    `SELECT LOWER(TRIM(name)) AS n FROM public.conditional_rules
     WHERE LOWER(TRIM(name)) = $1
       AND ($2::bigint IS NULL OR id <> $2::bigint)
     LIMIT 1`,
    [key, excludeId && /^\d+$/.test(excludeId) ? excludeId : null]
  );
  return rows.length > 0;
}

function deriveTransactionType(triggers: { field: string; value: string }[]): "listing" | "buyer_file" | null {
  const t = triggers.find((x) => x.field === "transactionType");
  if (!t) return null;
  if (t.value === "Listing") return "listing";
  if (t.value === "Buyer File") return "buyer_file";
  return null;
}

type RuleDbRow = {
  id: string;
  name: string;
  kind: "standard" | "conditional";
  triggers_json: unknown;
  actions_json: unknown;
  documents_json: unknown;
  is_active: boolean;
  created_at: Date;
  transaction_type: string | null;
  property_type: string | null;
};

async function loadStandardDocuments(pool: Pool, ruleId: number): Promise<DocumentRuleRow[]> {
  const { rows } = await pool.query<{
    document_type_id: string;
    display_name: string;
    required: boolean;
    section_label: string | null;
    description: string | null;
    sort_order: number | null;
  }>(
    `SELECT dt.id::text AS document_type_id, dt.display_name, dsm.required,
            dsm.section_label, dt.description, dsm.sort_order
     FROM public.conditional_rule_sets crs
     JOIN public.document_set_members dsm ON dsm.document_set_id = crs.document_set_id
     JOIN public.document_types dt ON dt.id = dsm.document_type_id
     WHERE crs.rule_id = $1
     ORDER BY dsm.sort_order ASC NULLS LAST, dt.display_name`,
    [ruleId]
  );
  return rows.map((r) => ({
    id: r.document_type_id,
    name: r.display_name,
    required: r.required,
    section: r.section_label ?? undefined,
    note: r.description ?? undefined,
  }));
}

async function hydrateRule(pool: Pool, r: RuleDbRow): Promise<ConditionalRuleApiRow> {
  const triggers = parseTriggers(r.triggers_json);
  const actions = parseActions(r.actions_json);
  let documents: DocumentRuleRow[] = [];
  if (r.kind === "standard") {
    if (r.documents_json != null) {
      documents = parseDocuments(r.documents_json);
    } else {
      documents = await loadStandardDocuments(pool, Number(r.id));
    }
  }

  const createdAt =
    r.created_at instanceof Date ? r.created_at.toISOString().split("T")[0] : String(r.created_at);

  const uiTx =
    r.transaction_type === "listing"
      ? "Listing"
      : r.transaction_type === "buyer_file"
        ? "Buyer File"
        : undefined;

  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    triggers,
    documents,
    actions,
    isActive: r.is_active,
    createdAt,
    transactionType: uiTx,
    propertyType: r.property_type ?? undefined,
  };
}

/**
 * Full rules payload for Settings → Document Rules (matches frontend ConditionalFormattingRule shape).
 */
export async function listHydratedDocumentRules(pool: Pool): Promise<ConditionalRuleApiRow[]> {
  const { rows: rules } = await pool.query<RuleDbRow>(
    `SELECT id::text, name, kind, triggers_json, actions_json, documents_json, is_active, created_at,
            transaction_type::text, property_type::text
     FROM public.conditional_rules
     ORDER BY id ASC`
  );

  const out: ConditionalRuleApiRow[] = [];
  for (const r of rules) {
    out.push(await hydrateRule(pool, r));
  }
  return out;
}

export async function getHydratedDocumentRuleById(
  pool: Pool,
  id: string
): Promise<ConditionalRuleApiRow | null> {
  if (!/^\d+$/.test(id)) return null;
  const { rows } = await pool.query<RuleDbRow>(
    `SELECT id::text, name, kind, triggers_json, actions_json, documents_json, is_active, created_at,
            transaction_type::text, property_type::text
     FROM public.conditional_rules
     WHERE id = $1::bigint`,
    [id]
  );
  const r = rows[0];
  if (!r) return null;
  return hydrateRule(pool, r);
}

export async function createDocumentRule(
  pool: Pool,
  input: UpsertDocumentRuleInput
): Promise<{ rule: ConditionalRuleApiRow } | { error: ValidationFailure }> {
  const v = validateUpsertDocumentRule(input);
  if (v) return { error: v };
  const taken = await isDocumentRuleNameTaken(pool, input.name, null);
  if (taken) {
    return {
      error: {
        status: 409,
        code: "RULE_NAME_TAKEN",
        message: "Another rule already uses this name.",
      },
    };
  }

  const tx = deriveTransactionType(input.triggers);
  const triggersJson = JSON.stringify(input.triggers);
  const documentsJson =
    input.kind === "standard" ? JSON.stringify(input.documents.filter((d) => d.name?.trim())) : null;
  const actionsJson =
    input.kind === "conditional" ? JSON.stringify(input.actions.filter((a) => a.documentName?.trim())) : null;

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO public.conditional_rules (
       name, kind, triggers_json, transaction_type, property_type, is_active,
       actions_json, documents_json, created_at, updated_at
     )
     VALUES (
       $1, $2::public.rule_kind, $3::jsonb, $4::public.transaction_type, NULL, $5,
       $6::jsonb, $7::jsonb, now(), now()
     )
     RETURNING id::text`,
    [input.name.trim(), input.kind, triggersJson, tx, input.isActive !== false, actionsJson, documentsJson]
  );
  const newId = rows[0]?.id;
  if (!newId) {
    return {
      error: {
        status: 500,
        code: "RULE_CREATE_FAILED",
        message: "Could not create rule.",
      },
    };
  }
  const rule = await getHydratedDocumentRuleById(pool, newId);
  if (!rule) {
    return {
      error: {
        status: 500,
        code: "RULE_LOAD_FAILED",
        message: "Rule was created but could not be loaded.",
      },
    };
  }
  return { rule };
}

export async function updateDocumentRule(
  pool: Pool,
  id: string,
  input: UpsertDocumentRuleInput
): Promise<{ rule: ConditionalRuleApiRow } | { error: ValidationFailure } | { error: { status: 404; code: string; message: string } }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "RULE_NOT_FOUND", message: "Rule not found." } };
  }
  const v = validateUpsertDocumentRule(input);
  if (v) return { error: v };
  const taken = await isDocumentRuleNameTaken(pool, input.name, id);
  if (taken) {
    return {
      error: {
        status: 409,
        code: "RULE_NAME_TAKEN",
        message: "Another rule already uses this name.",
      },
    };
  }

  const tx = deriveTransactionType(input.triggers);
  const triggersJson = JSON.stringify(input.triggers);
  const documentsJson =
    input.kind === "standard" ? JSON.stringify(input.documents.filter((d) => d.name?.trim())) : null;
  const actionsJson =
    input.kind === "conditional" ? JSON.stringify(input.actions.filter((a) => a.documentName?.trim())) : null;

  const { rowCount } = await pool.query(
    `UPDATE public.conditional_rules
     SET name = $1,
         kind = $2::public.rule_kind,
         triggers_json = $3::jsonb,
         transaction_type = $4::public.transaction_type,
         property_type = NULL,
         is_active = $5,
         actions_json = $6::jsonb,
         documents_json = $7::jsonb,
         updated_at = now()
     WHERE id = $8::bigint`,
    [input.name.trim(), input.kind, triggersJson, tx, input.isActive !== false, actionsJson, documentsJson, id]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "RULE_NOT_FOUND", message: "Rule not found." } };
  }
  const rule = await getHydratedDocumentRuleById(pool, id);
  if (!rule) {
    return { error: { status: 404, code: "RULE_NOT_FOUND", message: "Rule not found." } };
  }
  return { rule };
}

export async function patchDocumentRuleIsActive(
  pool: Pool,
  id: string,
  isActive: boolean
): Promise<{ rule: ConditionalRuleApiRow } | { error: { status: number; code: string; message: string } }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "RULE_NOT_FOUND", message: "Rule not found." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.conditional_rules SET is_active = $1, updated_at = now() WHERE id = $2::bigint`,
    [isActive, id]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "RULE_NOT_FOUND", message: "Rule not found." } };
  }
  const rule = await getHydratedDocumentRuleById(pool, id);
  if (!rule) {
    return { error: { status: 404, code: "RULE_NOT_FOUND", message: "Rule not found." } };
  }
  return { rule };
}

export async function deleteDocumentRule(
  pool: Pool,
  id: string
): Promise<{ ok: true } | { error: { status: number; code: string; message: string } }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "RULE_NOT_FOUND", message: "Rule not found." } };
  }
  const { rows: inUse } = await pool.query<{ n: string }>(
    `SELECT 1::text AS n
     FROM public.project_documents
     WHERE source_rule_id = $1::bigint
       AND deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
  if (inUse.length > 0) {
    return {
      error: {
        status: 409,
        code: "RULE_IN_USE",
        message: "This rule is linked to checklist rows on active transactions. Remove those rows first.",
      },
    };
  }
  const { rowCount } = await pool.query(`DELETE FROM public.conditional_rules WHERE id = $1::bigint`, [id]);
  if (!rowCount) {
    return { error: { status: 404, code: "RULE_NOT_FOUND", message: "Rule not found." } };
  }
  return { ok: true };
}
