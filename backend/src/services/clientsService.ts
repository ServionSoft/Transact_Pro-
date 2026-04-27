import type { Pool } from "pg";

export type ClientApiRow = {
  id: string;
  name: string;
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
  createdAt: string;
  projectCount: number;
};

export type ClientUpsertInput = {
  name: string;
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

function validateClientInput(input: ClientUpsertInput): ServiceError | null {
  const name = normalizeText(input.name);
  const email = normalizeText(input.email);
  if (!name) {
    return { status: 400, code: "CLIENT_NAME_REQUIRED", message: "Client name is required." };
  }
  if (!email) {
    return { status: 400, code: "CLIENT_EMAIL_REQUIRED", message: "Client email is required." };
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return { status: 400, code: "CLIENT_EMAIL_INVALID", message: "Enter a valid email address." };
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
  created_at: Date;
  project_count: number | string | null;
};

function rowToClient(row: ClientDbRow): ClientApiRow {
  const createdAt =
    row.created_at instanceof Date ? row.created_at.toISOString().split("T")[0] : String(row.created_at);
  return {
    id: row.id,
    name: row.name,
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
    createdAt,
    projectCount: Number(row.project_count ?? 0),
  };
}

async function linkedProjectCount(pool: Pool, clientId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM public.projects WHERE client_id = $1::bigint`,
    [clientId]
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

export async function listClients(pool: Pool): Promise<ClientApiRow[]> {
  const { rows } = await pool.query<ClientDbRow>(
    `SELECT
       c.id::text,
       c.name,
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
       c.created_at,
       COUNT(p.id)::int AS project_count
     FROM public.clients c
     LEFT JOIN public.projects p ON p.client_id = c.id
     WHERE c.deleted_at IS NULL
     GROUP BY c.id
     ORDER BY c.name ASC
     LIMIT 1000`
  );
  return rows.map(rowToClient);
}

export async function getClientById(pool: Pool, id: string): Promise<ClientApiRow | null> {
  if (!/^\d+$/.test(id)) return null;
  const { rows } = await pool.query<ClientDbRow>(
    `SELECT
       c.id::text,
       c.name,
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
       c.created_at,
       COUNT(p.id)::int AS project_count
     FROM public.clients c
     LEFT JOIN public.projects p ON p.client_id = c.id
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
  const validation = validateClientInput(input);
  if (validation) return { error: validation };

  const status = statusToDb(input.status) ?? "active";
  const createdBy = await resolveCreatedByUserId(pool, createdByUserId);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO public.clients (
       name, email, phone, company, agent_role_text, status, notes,
       primary_address, city, state, zip, created_by_user_id, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6::public.client_status, $7,
       $8, $9, $10, $11, $12, now(), now()
     )
     RETURNING id::text`,
    [
      normalizeText(input.name),
      normalizeText(input.email),
      normalizeText(input.phone),
      normalizeText(input.company),
      normalizeText(input.role),
      status,
      normalizeText(input.notes),
      normalizeText(input.propertyAddress),
      normalizeText(input.city),
      normalizeText(input.state),
      normalizeText(input.zip),
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
  const validation = validateClientInput(input);
  if (validation) return { error: validation };

  const status = statusToDb(input.status) ?? "active";
  const { rowCount } = await pool.query(
    `UPDATE public.clients
     SET name = $1,
         email = $2,
         phone = $3,
         company = $4,
         agent_role_text = $5,
         status = $6::public.client_status,
         notes = $7,
         primary_address = $8,
         city = $9,
         state = $10,
         zip = $11,
         updated_at = now()
     WHERE id = $12::bigint
       AND deleted_at IS NULL`,
    [
      normalizeText(input.name),
      normalizeText(input.email),
      normalizeText(input.phone),
      normalizeText(input.company),
      normalizeText(input.role),
      status,
      normalizeText(input.notes),
      normalizeText(input.propertyAddress),
      normalizeText(input.city),
      normalizeText(input.state),
      normalizeText(input.zip),
      id,
    ]
  );
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
  id: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.clients
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

export async function permanentlyDeleteClient(
  pool: Pool,
  id: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  const links = await linkedProjectCount(pool, id);
  if (links > 0) {
    return {
      error: {
        status: 409,
        code: "CLIENT_HAS_PROJECTS",
        message: "Client has linked projects. Delete or reassign those projects first.",
      },
    };
  }
  const { rowCount } = await pool.query(`DELETE FROM public.clients WHERE id = $1::bigint`, [id]);
  if (!rowCount) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Client not found." } };
  }
  return { ok: true };
}
