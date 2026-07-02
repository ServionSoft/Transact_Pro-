import type { Pool } from "pg";
import {
  type CompassSeedPhase,
  getCompassTasksForPhase,
} from "../data/compassTaskTemplates.js";

const STAGE_UI_TO_DB: Record<string, string> = {
  "Listing Prep": "listing_prep",
  "Listing Complete": "listing_complete",
  "In Escrow": "in_escrow",
  "Ready to Close": "ready_to_close",
  Closed: "closed",
};

function mapStageToDb(stage: string): string {
  return STAGE_UI_TO_DB[stage] ?? "listing_prep";
}

async function resolveEmailTemplateId(pool: Pool, templateKey: string): Promise<string | null> {
  const key = templateKey.trim();
  if (!key) return null;
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id::text
     FROM public.email_templates
     WHERE lower(btrim(template_key)) = lower(btrim($1))
       AND deleted_at IS NULL
       AND is_active = true
     LIMIT 1`,
    [key]
  );
  return rows[0]?.id ?? null;
}

async function templateItemAlreadySeeded(pool: Pool, projectId: string, templateItemKey: string): Promise<boolean> {
  const { rows } = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok
     FROM public.project_tasks
     WHERE project_id = $1::bigint
       AND template_item_key = $2
     LIMIT 1`,
    [projectId, templateItemKey]
  );
  return rows.length > 0;
}

export function isContractAcceptedInMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  return (metadata as Record<string, unknown>).contractAccepted === true;
}

/**
 * Seed Compass workflow tasks for a project. Idempotent per template_item_key.
 * Returns count of newly inserted tasks.
 */
export async function seedCompassProjectTasks(
  pool: Pool,
  projectId: string,
  transactionType: "Listing" | "Buyer File",
  phase: CompassSeedPhase
): Promise<number> {
  if (!/^\d+$/.test(projectId)) return 0;

  const templates = getCompassTasksForPhase(transactionType, phase);
  let inserted = 0;

  for (const tpl of templates) {
    if (await templateItemAlreadySeeded(pool, projectId, tpl.key)) continue;

    const taskTypeDb = tpl.taskType === "email" ? "email" : "general";
    const emailTemplateId =
      taskTypeDb === "email" && tpl.emailTemplateKey
        ? await resolveEmailTemplateId(pool, tpl.emailTemplateKey)
        : null;
    const stageDb = mapStageToDb(tpl.defaultStage);
    const instructionUrl = tpl.instructionUrl?.trim() || null;

    await pool.query(
      `INSERT INTO public.project_tasks (
         project_id, title, stage, status, due_date, completed_at,
         task_type, email_template_id, recipient_email,
         task_section, sort_order, instruction_url, template_item_key,
         created_at, updated_at
       ) VALUES (
         $1::bigint, $2, $3::public.project_stage, 'pending'::public.task_status, NULL, NULL,
         $4::public.project_task_type, $5::bigint, NULL,
         $6, $7, $8, $9,
         now(), now()
       )`,
      [
        projectId,
        tpl.title,
        stageDb,
        taskTypeDb,
        emailTemplateId,
        tpl.section,
        tpl.sortOrder,
        instructionUrl,
        tpl.key,
      ]
    );
    inserted += 1;
  }

  return inserted;
}

/** Seed Compass tasks when a project has none yet (existing transactions created before seeding). */
export async function ensureInitialCompassTasksSeeded(
  pool: Pool,
  projectId: string,
  transactionType: "Listing" | "Buyer File",
  metadata: unknown
): Promise<boolean> {
  if (!/^\d+$/.test(projectId)) return false;

  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM public.project_tasks WHERE project_id = $1::bigint`,
    [projectId]
  );
  if (Number(rows[0]?.count ?? 0) > 0) return false;

  if (transactionType === "Buyer File") {
    await seedCompassProjectTasks(pool, projectId, "Buyer File", "buyer_all");
  } else {
    await seedCompassProjectTasks(pool, projectId, "Listing", "listing_pre_contract");
    if (isContractAcceptedInMetadata(metadata)) {
      await seedCompassProjectTasks(pool, projectId, "Listing", "listing_post_contract");
    }
  }
  return true;
}
