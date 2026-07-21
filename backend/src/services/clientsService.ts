import type { Pool } from "pg";

export type ClientAssistant = {
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  email?: string;
};

export type ClientDetails = {
  licenseNumber?: string;
  brokerageLicense?: string;
  logo?: string;
  /** @deprecated single-assistant legacy shape; still read for back-compat, superseded by `assistants`. */
  assistant?: ClientAssistant;
  /** Escrow officer roster; the first entry is the default used to auto-fill transactions. */
  assistants?: ClientAssistant[];
};

/** Guardrail against runaway roster input on an officer's contact. */
const MAX_ASSISTANTS = 5;

export type ClientApiRow = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: "Active" | "Inactive" | "Prospect";
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  assistantContactId: string;
  details: ClientDetails;
  createdAt: string;
  projectCount: number;
};

export type ClientUpsertInput = {
  name?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  email: string;
  phone?: string;
  company?: string;
  role?: string;
  status?: string;
  propertyAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  assistantContactId?: string;
  details?: ClientDetails;
};

export type ServiceError = {
  status: number;
  code: string;
  message: string;
};

const STATUS_TO_DB: Record<string, "active" | "inactive" | "prospect"> = {
  active: "active",
  inactive: "inactive",
  prospect: "prospect",
};

function statusToDb(raw: string | undefined): "active" | "inactive" | "prospect" | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return STATUS_TO_DB[key] ?? null;
}

function statusToUi(raw: string): ClientApiRow["status"] {
  if (raw === "inactive") return "Inactive";
  if (raw === "prospect") return "Prospect";
  return "Active";
}

function normalizeText(v: string | undefined): string {
  return (v ?? "").trim();
}

/** Lender contacts intentionally omit email (safety measure) and phone. */
function isLenderRole(role: string | undefined): boolean {
  return normalizeText(role).toLowerCase() === "lender";
}

/** Whitelists the type-specific detail fields; never trusts arbitrary JSON from the client. */
function sanitizeDetails(raw: unknown): ClientDetails {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const str = (v: unknown): string | undefined => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : undefined;
  };
  const details: ClientDetails = {};
  if (str(o.licenseNumber)) details.licenseNumber = str(o.licenseNumber);
  if (str(o.brokerageLicense)) details.brokerageLicense = str(o.brokerageLicense);
  // Logo is a data URL; keep as-is (only when it looks like one) without trimming away content.
  if (typeof o.logo === "string" && o.logo.startsWith("data:image/")) details.logo = o.logo;
  const toAssistant = (raw: unknown): ClientAssistant | null => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const a = raw as Record<string, unknown>;
    const assistant: ClientAssistant = {
      firstName: str(a.firstName),
      lastName: str(a.lastName),
      preferredName: str(a.preferredName),
      email: str(a.email),
    };
    return assistant.firstName || assistant.lastName || assistant.preferredName || assistant.email
      ? assistant
      : null;
  };
  // Accept the new `assistants` array; fall back to the legacy single `assistant`.
  const rawList = Array.isArray(o.assistants) ? o.assistants : o.assistant != null ? [o.assistant] : [];
  const assistants = rawList
    .map(toAssistant)
    .filter((x): x is ClientAssistant => x !== null)
    .slice(0, MAX_ASSISTANTS);
  if (assistants.length) details.assistants = assistants;
  return details;
}

/**
 * Resolves the name parts from the input. `first`/`last` are the source of truth;
 * `name` is the combined value kept for display/sort/tokens; `preferred` is required
 * (validated separately) and used by email templates for greetings.
 */
function deriveNames(input: ClientUpsertInput): {
  name: string;
  first: string;
  last: string;
  preferred: string | null;
} {
  const first = normalizeText(input.firstName);
  const last = normalizeText(input.lastName);
  const combined = [first, last].filter(Boolean).join(" ") || normalizeText(input.name);
  const preferred = normalizeText(input.preferredName);
  return { name: combined, first, last, preferred: preferred || null };
}

function validateClientInput(input: ClientUpsertInput, resolvedName: string): ServiceError | null {
  const name = normalizeText(resolvedName);
  const email = normalizeText(input.email);
  if (!name) {
    return { status: 400, code: "CLIENT_NAME_REQUIRED", message: "Client name is required." };
  }
  if (!normalizeText(input.preferredName)) {
    return { status: 400, code: "CLIENT_PREFERRED_NAME_REQUIRED", message: "Preferred name is required." };
  }
  // Email is optional (add later); validate format only when provided. Lender omits email entirely.
  if (email) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return { status: 400, code: "CLIENT_EMAIL_INVALID", message: "Enter a valid email address." };
    }
  }
  if (input.status !== undefined && statusToDb(input.status) == null) {
    return {
      status: 400,
      code: "CLIENT_STATUS_INVALID",
      message: "Status must be Active, Inactive, or Prospect.",
    };
  }
  return null;
}

type ClientDbRow = {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  agent_role_text: string | null;
  status: "active" | "inactive" | "prospect";
  primary_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  assistant_contact_id: string | null;
  details: unknown;
  created_at: Date;
  project_count: number | string | null;
};

async function validateAssistantContactId(
  pool: Pool,
  assistantContactId: string | undefined,
  officerContactId?: string
): Promise<ServiceError | null> {
  const raw = normalizeText(assistantContactId);
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) {
    return { status: 400, code: "CLIENT_ASSISTANT_INVALID", message: "Default assistant contact is invalid." };
  }
  if (officerContactId && raw === officerContactId) {
    return { status: 400, code: "CLIENT_ASSISTANT_SELF", message: "Escrow officer cannot be their own assistant." };
  }
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id::text FROM public.contacts WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [raw]
  );
  if (!rows[0]?.id) {
    return { status: 400, code: "CLIENT_ASSISTANT_NOT_FOUND", message: "Default assistant contact was not found." };
  }
  return null;
}

function rowToClient(row: ClientDbRow): ClientApiRow {
  const createdAt =
    row.created_at instanceof Date ? row.created_at.toISOString().split("T")[0] : String(row.created_at);
  return {
    id: row.id,
    name: row.name,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    preferredName: row.preferred_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    company: row.company ?? "",
    role: row.agent_role_text ?? "",
    status: statusToUi(row.status),
    propertyAddress: row.primary_address ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    zip: row.zip ?? "",
    notes: row.notes ?? "",
    assistantContactId: row.assistant_contact_id ?? "",
    details: sanitizeDetails(row.details),
    createdAt,
    projectCount: Number(row.project_count ?? 0),
  };
}

/** Active transactions for a contact (matches project list + contact detail). */
function linkedProjectsJoinSql(crmVaultProjectId: number): string {
  return `LEFT JOIN public.projects p ON p.client_id = c.id
     AND p.deleted_at IS NULL
     AND p.id <> ${Number(crmVaultProjectId)}::bigint`;
}

/** Active transactions linked to this contact (excludes CRM vault). */
async function linkedProjectCount(pool: Pool, clientId: string, crmVaultProjectId: number): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM public.projects
     WHERE client_id = $1::bigint
       AND deleted_at IS NULL
       AND id <> $2::bigint`,
    [clientId, crmVaultProjectId]
  );
  return Number(rows[0]?.count ?? "0");
}

/** Any project row for this contact, including archived transactions. */
async function linkedProjectCountAll(pool: Pool, clientId: string, crmVaultProjectId: number): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM public.projects
     WHERE client_id = $1::bigint
       AND id <> $2::bigint`,
    [clientId, crmVaultProjectId]
  );
  return Number(rows[0]?.count ?? "0");
}

async function resolveCreatedByUserId(pool: Pool, raw: number | undefined): Promise<number | null> {
  if (!Number.isInteger(raw)) return null;
  const candidate = Number(raw);
  const { rows } = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM public.users WHERE id = $1::bigint LIMIT 1`,
    [candidate]
  );
  return rows.length ? candidate : null;
}

export async function listClients(
  pool: Pool,
  archived = false,
  crmVaultProjectId = 1
): Promise<ClientApiRow[]> {
  const vaultId = Number(crmVaultProjectId) || 1;
  const { rows } = await pool.query<ClientDbRow>(
    `SELECT
       c.id::text,
       c.name,
       c.first_name,
       c.last_name,
       c.preferred_name,
       c.email,
       c.phone,
       c.company,
       c.agent_role_text,
       c.status,
       c.primary_address,
       c.city,
       c.state,
       c.zip,
       c.notes,
       c.assistant_contact_id::text,
       c.details,
       c.created_at,
       COUNT(p.id)::int AS project_count
     FROM public.contacts c
     ${linkedProjectsJoinSql(vaultId)}
     WHERE ${archived ? "c.deleted_at IS NOT NULL" : "c.deleted_at IS NULL"}
     GROUP BY c.id
     ORDER BY c.name ASC
     LIMIT 1000`
  );
  return rows.map(rowToClient);
}

export async function getClientById(
  pool: Pool,
  id: string,
  crmVaultProjectId = 1
): Promise<ClientApiRow | null> {
  if (!/^\d+$/.test(id)) return null;
  const vaultId = Number(crmVaultProjectId) || 1;
  const { rows } = await pool.query<ClientDbRow>(
    `SELECT
       c.id::text,
       c.name,
       c.first_name,
       c.last_name,
       c.preferred_name,
       c.email,
       c.phone,
       c.company,
       c.agent_role_text,
       c.status,
       c.primary_address,
       c.city,
       c.state,
       c.zip,
       c.notes,
       c.assistant_contact_id::text,
       c.details,
       c.created_at,
       COUNT(p.id)::int AS project_count
     FROM public.contacts c
     ${linkedProjectsJoinSql(vaultId)}
     WHERE c.id = $1::bigint
       AND c.deleted_at IS NULL
     GROUP BY c.id`,
    [id]
  );
  const row = rows[0];
  return row ? rowToClient(row) : null;
}

export async function createClient(
  pool: Pool,
  input: ClientUpsertInput,
  createdByUserId: number | undefined
): Promise<{ client: ClientApiRow } | { error: ServiceError }> {
  const names = deriveNames(input);
  const validation = validateClientInput(input, names.name);
  if (validation) return { error: validation };

  const assistantErr = await validateAssistantContactId(pool, input.assistantContactId);
  if (assistantErr) return { error: assistantErr };

  const emailKey = normalizeText(input.email).toLowerCase();
  if (emailKey) {
    const existingId = await pool.query<{ id: string }>(
      `SELECT id::text FROM public.contacts
       WHERE deleted_at IS NULL
         AND email IS NOT NULL
         AND lower(btrim(email::text)) = $1
       LIMIT 1`,
      [emailKey]
    );
    if (existingId.rows[0]?.id) {
      const existing = await getClientById(pool, existingId.rows[0].id);
      if (existing) return { client: existing };
    }
  }

  const status = statusToDb(input.status) ?? "active";
  const createdBy = await resolveCreatedByUserId(pool, createdByUserId);
  const lender = isLenderRole(input.role);
  const details = sanitizeDetails(input.details);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO public.contacts (
       name, first_name, last_name, preferred_name, email, phone, company, agent_role_text, status, notes,
       primary_address, city, state, zip, assistant_contact_id, details, created_by_user_id, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9::public.client_status, $10,
       $11, $12, $13, $14, $15::bigint, $16::jsonb, $17, now(), now()
     )
     RETURNING id::text`,
    [
      names.name,
      names.first || null,
      names.last || null,
      names.preferred,
      lender ? "" : normalizeText(input.email),
      lender ? "" : normalizeText(input.phone),
      normalizeText(input.company),
      normalizeText(input.role),
      status,
      normalizeText(input.notes),
      normalizeText(input.propertyAddress),
      normalizeText(input.city),
      normalizeText(input.state),
      normalizeText(input.zip),
      normalizeText(input.assistantContactId) || null,
      JSON.stringify(details),
      createdBy,
    ]
  );
  const id = rows[0]?.id;
  if (!id) {
    return { error: { status: 500, code: "CLIENT_CREATE_FAILED", message: "Could not create client." } };
  }
  const client = await getClientById(pool, id);
  if (!client) {
    return {
      error: { status: 500, code: "CLIENT_LOAD_FAILED", message: "Client was created but could not be loaded." },
    };
  }
  return { client };
}

export async function updateClient(
  pool: Pool,
  id: string,
  input: ClientUpsertInput
): Promise<{ client: ClientApiRow } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  const names = deriveNames(input);
  const validation = validateClientInput(input, names.name);
  if (validation) return { error: validation };

  const assistantErr = await validateAssistantContactId(pool, input.assistantContactId, id);
  if (assistantErr) return { error: assistantErr };

  const lender = isLenderRole(input.role);
  const details = sanitizeDetails(input.details);
  const emailNorm = lender ? "" : normalizeText(input.email).toLowerCase();
  if (emailNorm) {
    const dup = await pool.query<{ id: string }>(
      `SELECT id::text
       FROM public.contacts
       WHERE deleted_at IS NULL
         AND email IS NOT NULL
         AND btrim(email::text) <> ''
         AND lower(btrim(email::text)) = $1
         AND id <> $2::bigint
       LIMIT 1`,
      [emailNorm, id]
    );
    if (dup.rows[0]?.id) {
      return {
        error: {
          status: 409,
          code: "CLIENT_EMAIL_DUPLICATE",
          message: "Another active contact already uses this email address.",
        },
      };
    }
  }

  const status = statusToDb(input.status) ?? "active";
  let rowCount: number | null;
  try {
    const res = await pool.query(
      `UPDATE public.contacts
       SET name = $1,
           first_name = $2,
           last_name = $3,
           preferred_name = $4,
           email = $5,
           phone = $6,
           company = $7,
           agent_role_text = $8,
           status = $9::public.client_status,
           notes = $10,
           primary_address = $11,
           city = $12,
           state = $13,
           zip = $14,
           assistant_contact_id = $15::bigint,
           details = $16::jsonb,
           updated_at = now()
       WHERE id = $17::bigint
         AND deleted_at IS NULL`,
      [
        names.name,
        names.first || null,
        names.last || null,
        names.preferred,
        lender ? "" : normalizeText(input.email),
        lender ? "" : normalizeText(input.phone),
        normalizeText(input.company),
        normalizeText(input.role),
        status,
        normalizeText(input.notes),
        normalizeText(input.propertyAddress),
        normalizeText(input.city),
        normalizeText(input.state),
        normalizeText(input.zip),
        normalizeText(input.assistantContactId) || null,
        JSON.stringify(details),
        id,
      ]
    );
    rowCount = res.rowCount;
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "23505") {
      return {
        error: {
          status: 409,
          code: "CLIENT_EMAIL_DUPLICATE",
          message: "Another active contact already uses this email address.",
        },
      };
    }
    throw e;
  }
  if (!rowCount) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  const client = await getClientById(pool, id);
  if (!client) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  return { client };
}

export async function archiveClient(
  pool: Pool,
  id: string,
  crmVaultProjectId = 1
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  const links = await linkedProjectCount(pool, id, crmVaultProjectId);
  if (links > 0) {
    return {
      error: {
        status: 409,
        code: "CLIENT_HAS_PROJECTS",
        message:
          "This contact is linked to active transactions. Reassign the primary contact on those transactions or archive the transactions first.",
      },
    };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.contacts
     SET deleted_at = now(),
         updated_at = now()
     WHERE id = $1::bigint
       AND deleted_at IS NULL`,
    [id]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  return { ok: true };
}

export async function unarchiveClient(
  pool: Pool,
  id: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.contacts
     SET deleted_at = NULL,
         updated_at = now()
     WHERE id = $1::bigint
       AND deleted_at IS NOT NULL`,
    [id]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Archived client not found." } };
  }
  return { ok: true };
}

export async function permanentlyDeleteClient(
  pool: Pool,
  id: string,
  crmVaultProjectId = 1
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  const activeLinks = await linkedProjectCount(pool, id, crmVaultProjectId);
  if (activeLinks > 0) {
    return {
      error: {
        status: 409,
        code: "CLIENT_HAS_PROJECTS",
        message: "Client has active linked transactions. Archive or reassign those transactions first.",
      },
    };
  }
  const allLinks = await linkedProjectCountAll(pool, id, crmVaultProjectId);
  if (allLinks > 0) {
    return {
      error: {
        status: 409,
        code: "CLIENT_HAS_ARCHIVED_PROJECTS",
        message:
          "Client still has archived transaction records. Permanently remove those archived transactions before deleting this contact.",
      },
    };
  }
  const { rowCount } = await pool.query(`DELETE FROM public.contacts WHERE id = $1::bigint`, [id]);
  if (!rowCount) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  return { ok: true };
}
