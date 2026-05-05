import type { Pool } from "pg";

type ServiceError = { status: number; code: string; message: string };

export type EmailTemplateApi = {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplateUpsertInput = {
  name: string;
  category: string;
  subject: string;
  body: string;
  isActive?: boolean;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mapRow(row: {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}): EmailTemplateApi {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subject: row.subject,
    body: row.body,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function validate(input: EmailTemplateUpsertInput): ServiceError | null {
  if (!normalizeText(input.name)) {
    return { status: 400, code: "EMAIL_TEMPLATE_NAME_REQUIRED", message: "Template name is required." };
  }
  if (!normalizeText(input.category)) {
    return { status: 400, code: "EMAIL_TEMPLATE_CATEGORY_REQUIRED", message: "Template category is required." };
  }
  if (!normalizeText(input.subject)) {
    return { status: 400, code: "EMAIL_TEMPLATE_SUBJECT_REQUIRED", message: "Template subject is required." };
  }
  if (!normalizeText(input.body)) {
    return { status: 400, code: "EMAIL_TEMPLATE_BODY_REQUIRED", message: "Template body is required." };
  }
  return null;
}

export async function listEmailTemplates(pool: Pool): Promise<EmailTemplateApi[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    category: string;
    subject: string;
    body: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id::text, name, category, subject, body, is_active, created_at, updated_at
     FROM public.email_templates
     WHERE deleted_at IS NULL
     ORDER BY updated_at DESC, id DESC`
  );
  return rows.map(mapRow);
}

export async function createEmailTemplate(
  pool: Pool,
  input: EmailTemplateUpsertInput,
  userId: string | null
): Promise<{ template: EmailTemplateApi } | { error: ServiceError }> {
  const invalid = validate(input);
  if (invalid) return { error: invalid };
  const createdBy = userId && /^\d+$/.test(userId) ? userId : null;
  try {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      category: string;
      subject: string;
      body: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO public.email_templates (
         name, category, subject, body, is_active, created_by_user_id, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, COALESCE($5::boolean, true), $6::bigint, now(), now()
       )
       RETURNING id::text, name, category, subject, body, is_active, created_at, updated_at`,
      [
        normalizeText(input.name),
        normalizeText(input.category),
        normalizeText(input.subject),
        normalizeText(input.body),
        typeof input.isActive === "boolean" ? input.isActive : null,
        createdBy,
      ]
    );
    return { template: mapRow(rows[0]) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("idx_email_templates_name_active")) {
      return {
        error: {
          status: 409,
          code: "EMAIL_TEMPLATE_DUPLICATE_NAME",
          message: "Another active template already uses this name.",
        },
      };
    }
    throw e;
  }
}

export async function updateEmailTemplate(
  pool: Pool,
  id: string,
  input: EmailTemplateUpsertInput
): Promise<{ template: EmailTemplateApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "EMAIL_TEMPLATE_NOT_FOUND", message: "Template not found." } };
  }
  const invalid = validate(input);
  if (invalid) return { error: invalid };
  try {
    const { rows } = await pool.query<{
      id: string;
      name: string;
      category: string;
      subject: string;
      body: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE public.email_templates
       SET
         name = $2,
         category = $3,
         subject = $4,
         body = $5,
         is_active = COALESCE($6::boolean, is_active),
         updated_at = now()
       WHERE id = $1::bigint
         AND deleted_at IS NULL
       RETURNING id::text, name, category, subject, body, is_active, created_at, updated_at`,
      [
        id,
        normalizeText(input.name),
        normalizeText(input.category),
        normalizeText(input.subject),
        normalizeText(input.body),
        typeof input.isActive === "boolean" ? input.isActive : null,
      ]
    );
    if (rows.length === 0) {
      return { error: { status: 404, code: "EMAIL_TEMPLATE_NOT_FOUND", message: "Template not found." } };
    }
    return { template: mapRow(rows[0]) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("idx_email_templates_name_active")) {
      return {
        error: {
          status: 409,
          code: "EMAIL_TEMPLATE_DUPLICATE_NAME",
          message: "Another active template already uses this name.",
        },
      };
    }
    throw e;
  }
}

export async function deleteEmailTemplate(
  pool: Pool,
  id: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) {
    return { error: { status: 404, code: "EMAIL_TEMPLATE_NOT_FOUND", message: "Template not found." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.email_templates
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::bigint
       AND deleted_at IS NULL`,
    [id]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "EMAIL_TEMPLATE_NOT_FOUND", message: "Template not found." } };
  }
  return { ok: true };
}

