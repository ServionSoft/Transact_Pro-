/**
 * Idempotent seed: upsert seller-disclosure email templates by template_key.
 *
 * Run:
 *   npm run db:seed:seller-emails          # local + render when .env.render exists
 *   npm run db:seed:seller-emails:local    # backend/.env only (matches npm run dev API)
 *   npm run db:seed:seller-emails:render   # backend/.env.render only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { SELLER_DISCLOSURE_EMAIL_TEMPLATES } from "../src/data/sellerDisclosureEmailTemplates.js";

const COMPASS_TASK_EMAIL_WIRES: { templateItemKey: string; emailTemplateKey: string }[] = [
  { templateItemKey: "compass_listing:L13", emailTemplateKey: "listing_disclosures_to_fill_out" },
  { templateItemKey: "compass_listing:L16", emailTemplateKey: "hoa_document_request" },
  { templateItemKey: "compass_listing:L17", emailTemplateKey: "listing_disclosure_link_agent" },
  { templateItemKey: "compass_listing:L18", emailTemplateKey: "seller_disclosures_batc" },
  { templateItemKey: "compass_listing:L20", emailTemplateKey: "missing_buyer_signed_batc" },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const localEnvPath = path.join(backendRoot, ".env");
const renderEnvPath = path.join(backendRoot, ".env.render");

type SeedTarget = "local" | "render";

function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? `${u.username}@` : ""}${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

function loadDatabaseUrl(target: SeedTarget): string {
  const parsed = dotenv.parse(fs.readFileSync(target === "local" ? localEnvPath : renderEnvPath, "utf8"));
  const url = parsed.DATABASE_URL?.trim();
  if (!url) {
    const file = target === "local" ? ".env" : ".env.render";
    throw new Error(`DATABASE_URL is missing in backend/${file}`);
  }
  return url;
}

function resolveTargets(argv: string[]): SeedTarget[] {
  const wantsLocal = argv.includes("--local");
  const wantsRender = argv.includes("--render");
  const wantsAll = argv.includes("--all") || (!wantsLocal && !wantsRender);

  const targets: SeedTarget[] = [];
  if (wantsAll || wantsLocal) {
    if (!fs.existsSync(localEnvPath)) {
      throw new Error("backend/.env not found");
    }
    targets.push("local");
  }
  if (wantsAll || wantsRender) {
    if (!fs.existsSync(renderEnvPath)) {
      if (wantsRender) {
        throw new Error("backend/.env.render not found (create it for Render DATABASE_URL)");
      }
      // --all without .env.render: local only
    } else {
      targets.push("render");
    }
  }
  if (targets.length === 0) {
    throw new Error("No seed targets resolved. Use --local, --render, or --all");
  }
  return targets;
}

async function upsertTemplate(
  client: pg.PoolClient,
  tpl: (typeof SELLER_DISCLOSURE_EMAIL_TEMPLATES)[number]
): Promise<"inserted" | "updated"> {
  const { rowCount } = await client.query(
    `UPDATE public.email_templates
     SET name = $2,
         category = $3,
         subject = $4,
         body = $5,
         updated_at = now()
     WHERE lower(btrim(template_key)) = lower(btrim($1))
       AND deleted_at IS NULL`,
    [tpl.templateKey, tpl.name, tpl.category, tpl.subject, tpl.body]
  );
  if ((rowCount ?? 0) > 0) return "updated";

  await client.query(
    `INSERT INTO public.email_templates (
       name, category, subject, body, template_key, is_active, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, true, now(), now())`,
    [tpl.name, tpl.category, tpl.subject, tpl.body, tpl.templateKey]
  );
  return "inserted";
}

async function seedOneTarget(target: SeedTarget): Promise<void> {
  const databaseUrl = loadDatabaseUrl(target);
  // eslint-disable-next-line no-console
  console.log(`\n=== ${target.toUpperCase()} (${maskDatabaseUrl(databaseUrl)}) ===`);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query("BEGIN");
    for (const tpl of SELLER_DISCLOSURE_EMAIL_TEMPLATES) {
      const result = await upsertTemplate(client, tpl);
      if (result === "inserted") inserted += 1;
      else updated += 1;
      // eslint-disable-next-line no-console
      console.log(`${result === "inserted" ? "+" : "~"} ${tpl.templateKey}`);
    }

    let wired = 0;
    for (const wire of COMPASS_TASK_EMAIL_WIRES) {
      const { rowCount } = await client.query(
        `UPDATE public.project_tasks pt
         SET task_type = 'email'::public.project_task_type,
             email_template_id = et.id,
             updated_at = now()
         FROM public.email_templates et
         WHERE pt.template_item_key = $1
           AND lower(btrim(et.template_key)) = lower(btrim($2))
           AND et.deleted_at IS NULL
           AND et.is_active = true`,
        [wire.templateItemKey, wire.emailTemplateKey]
      );
      wired += rowCount ?? 0;
    }
    if (wired > 0) {
      // eslint-disable-next-line no-console
      console.log(`ok  wired ${wired} existing Compass task(s) to email templates`);
    }

    await client.query("COMMIT");
    // eslint-disable-next-line no-console
    console.log(`ok  ${target}: ${inserted} inserted, ${updated} updated`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const targets = resolveTargets(process.argv.slice(2));
  for (const target of targets) {
    await seedOneTarget(target);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
