/**
 * Idempotent seed: document_types, document_sets, conditional_rules from
 * backend/seeds/document-rules.csv (export from Docs/Checklist Automation_.xlsx).
 *
 * Vault PDF links: backend/seeds/vault-template-map.csv + lookup stored_files
 * in CRM vault (CRM_VAULT_PROJECT_ID, default 1).
 *
 * Run: npm run db:seed:document-rules
 * Regenerate CSV after Excel edits: npm run db:export-document-rules-csv
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import {
  DOCUMENT_SET_BUYER_ID,
  DOCUMENT_SET_LISTING_ID,
  loadChecklistFromCsv,
  type ActionSeed,
  typeCodeFromAction,
  typeCodeFromMockId,
} from "./loadChecklistSeed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(backendRoot, ".env") });
const renderEnvPath = path.join(backendRoot, ".env.render");
if (fs.existsSync(renderEnvPath)) {
  dotenv.config({ path: renderEnvPath, override: true });
}

type DocumentJsonRow = {
  id: string;
  name: string;
  required: boolean;
  section?: string;
  note?: string;
  storedFileId?: string;
};

type ActionJsonRow = {
  id: string;
  documentName: string;
  action: string;
  note?: string;
  storedFileId?: string;
};

async function loadVaultFileIds(
  client: pg.PoolClient,
  vaultProjectId: number
): Promise<Map<string, string>> {
  const { rows } = await client.query<{ id: string; name: string }>(
    `SELECT id::text, name
     FROM public.stored_files
     WHERE project_id = $1::bigint AND deleted_at IS NULL
     ORDER BY id::bigint`,
    [vaultProjectId]
  );
  const byName = new Map<string, string>();
  for (const r of rows) {
    byName.set(r.name.trim().toLowerCase(), r.id);
  }
  return byName;
}

function resolveStoredFileId(
  vaultFilename: string,
  documentName: string,
  vaultByName: Map<string, string>
): string | undefined {
  const candidates = [vaultFilename.trim(), documentName.trim()].filter(Boolean);
  for (const c of candidates) {
    const id = vaultByName.get(c.toLowerCase());
    if (id) return id;
  }
  return undefined;
}

function buildDocumentsJson(
  docs: Array<{
    id: string;
    name: string;
    required: boolean;
    section?: string;
    note?: string;
    vaultFilename: string;
  }>,
  vaultByName: Map<string, string>
): DocumentJsonRow[] {
  return docs.map((d) => {
    const storedFileId = resolveStoredFileId(d.vaultFilename, d.name, vaultByName);
    return {
      id: d.id,
      name: d.name,
      required: d.required,
      ...(d.section ? { section: d.section } : {}),
      ...(d.note ? { note: d.note } : {}),
      ...(storedFileId ? { storedFileId } : {}),
    };
  });
}

function buildActionsJson(actions: ActionSeed[], vaultByName: Map<string, string>): ActionJsonRow[] {
  return actions.map((a) => {
    const storedFileId = resolveStoredFileId(a.vaultFilename, a.documentName, vaultByName);
    return {
      id: a.id,
      documentName: a.documentName,
      action: a.action,
      ...(a.note ? { note: a.note } : {}),
      ...(storedFileId ? { storedFileId } : {}),
    };
  });
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env");
  }

  const vaultProjectId = Number(process.env.CRM_VAULT_PROJECT_ID?.trim() || "1");
  const { listingRows, buyerRows, rules } = loadChecklistFromCsv();
  const RULE_IDS = rules.map((r) => r.id);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const vaultByName = await loadVaultFileIds(client, vaultProjectId);
  let vaultLinked = 0;

    const typeIdByCode = new Map<string, number>();

    for (const row of listingRows) {
      const code = typeCodeFromMockId(row.mockId);
      const r = await client.query<{ id: number }>(
        `INSERT INTO public.document_types (code, display_name, description, is_standard_car_form, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, false, true, now(), now())
         ON CONFLICT (code) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           description = COALESCE(EXCLUDED.description, public.document_types.description),
           updated_at = now()
         RETURNING id`,
        [code, row.name, row.note ?? null]
      );
      typeIdByCode.set(code, r.rows[0].id);
    }

    for (const rule of rules) {
      for (const a of rule.actions) {
        const code = typeCodeFromAction(a);
        if (typeIdByCode.has(code)) continue;
        const r = await client.query<{ id: number }>(
          `INSERT INTO public.document_types (code, display_name, description, is_standard_car_form, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, false, true, now(), now())
           ON CONFLICT (code) DO UPDATE SET
             display_name = EXCLUDED.display_name,
             description = COALESCE(EXCLUDED.description, public.document_types.description),
             updated_at = now()
           RETURNING id`,
          [code, a.documentName, a.note ?? null]
        );
        typeIdByCode.set(code, r.rows[0].id);
      }
    }

    await client.query(
      `INSERT INTO public.document_sets (id, name, description, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 1, true, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_active = true,
         updated_at = now()`,
      [DOCUMENT_SET_LISTING_ID, "Standard Listing Checklist", "From Checklist Automation_.xlsx"]
    );
    await client.query(
      `INSERT INTO public.document_sets (id, name, description, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 2, true, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_active = true,
         updated_at = now()`,
      [DOCUMENT_SET_BUYER_ID, "Standard Buyer File Checklist", "From Checklist Automation_.xlsx"]
    );

    await client.query(`DELETE FROM public.document_set_members WHERE document_set_id IN ($1, $2)`, [
      DOCUMENT_SET_LISTING_ID,
      DOCUMENT_SET_BUYER_ID,
    ]);

    let sort = 1;
    for (const row of listingRows) {
      const code = typeCodeFromMockId(row.mockId);
      const tid = typeIdByCode.get(code);
      if (tid == null) throw new Error(`Missing type ${code}`);
      await client.query(
        `INSERT INTO public.document_set_members (document_set_id, document_type_id, required, sort_order, section_label, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [DOCUMENT_SET_LISTING_ID, tid, row.required, sort++, row.section]
      );
    }

    sort = 1;
    for (const row of buyerRows) {
      const code = typeCodeFromMockId(row.mockId);
      const tid = typeIdByCode.get(code);
      if (tid == null) throw new Error(`Missing type ${code}`);
      await client.query(
        `INSERT INTO public.document_set_members (document_set_id, document_type_id, required, sort_order, section_label, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [DOCUMENT_SET_BUYER_ID, tid, row.required, sort++, row.section]
      );
    }

    await client.query(`DELETE FROM public.conditional_rule_sets WHERE rule_id = ANY($1::bigint[])`, [RULE_IDS]);
    await client.query(`DELETE FROM public.conditional_rule_documents WHERE rule_id = ANY($1::bigint[])`, [RULE_IDS]);
    await client.query(`DELETE FROM public.conditional_rules WHERE id = ANY($1::bigint[])`, [RULE_IDS]);

    for (const rule of rules) {
      const triggersJson = JSON.stringify(rule.triggers);
      const documentsJson =
        rule.kind === "standard" && rule.documents.length > 0
          ? JSON.stringify(buildDocumentsJson(rule.documents, vaultByName))
          : null;
      const actionsJson =
        rule.actions.length > 0 ? JSON.stringify(buildActionsJson(rule.actions, vaultByName)) : null;

      if (documentsJson) {
        const parsed = JSON.parse(documentsJson) as DocumentJsonRow[];
        vaultLinked += parsed.filter((d) => d.storedFileId).length;
      }
      if (actionsJson) {
        const parsed = JSON.parse(actionsJson) as ActionJsonRow[];
        vaultLinked += parsed.filter((a) => a.storedFileId).length;
      }

      await client.query(
        `INSERT INTO public.conditional_rules (
           id, name, kind, triggers_json, transaction_type, property_type, is_active,
           actions_json, documents_json, created_at, updated_at
         ) VALUES ($1, $2, $3::public.rule_kind, $4::jsonb, $5::public.transaction_type, NULL, true, $6::jsonb, $7::jsonb, now(), now())`,
        [
          rule.id,
          rule.name,
          rule.kind,
          triggersJson,
          rule.transactionType,
          actionsJson,
          documentsJson,
        ]
      );

      if (rule.kind === "standard") {
        const setId =
          rule.transactionType === "listing"
            ? DOCUMENT_SET_LISTING_ID
            : rule.transactionType === "buyer_file"
              ? DOCUMENT_SET_BUYER_ID
              : null;
        if (setId != null && rule.id !== 10019) {
          await client.query(
            `INSERT INTO public.conditional_rule_sets (rule_id, document_set_id, created_at, updated_at)
             VALUES ($1, $2, now(), now())`,
            [rule.id, setId]
          );
        }
      } else {
        for (const a of rule.actions) {
          if (a.action === "mark-na") continue;
          const code = typeCodeFromAction(a);
          const tid = typeIdByCode.get(code);
          if (tid == null) continue;
          const required = a.action === "add-required";
          await client.query(
            `INSERT INTO public.conditional_rule_documents (rule_id, document_type_id, required, created_at, updated_at)
             VALUES ($1, $2, $3, now(), now())
             ON CONFLICT (rule_id, document_type_id) DO UPDATE SET required = EXCLUDED.required, updated_at = now()`,
            [rule.id, tid, required]
          );
        }
      }
    }

    await client.query("COMMIT");

    await client.query(
      `SELECT setval(pg_get_serial_sequence('public.document_sets', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.document_sets))`
    );
    await client.query(
      `SELECT setval(pg_get_serial_sequence('public.conditional_rules', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.conditional_rules))`
    );

    // eslint-disable-next-line no-console
    console.log(
      `Document rules seed completed: ${listingRows.length} listing docs, ${buyerRows.length} buyer docs, ${rules.length} rules, ${vaultLinked} vault file link(s) (project ${vaultProjectId}).`
    );
    if (vaultLinked === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "No vault templates linked. Upload PDFs to CRM Documents on live, then edit backend/seeds/vault-template-map.csv and re-run seed."
      );
    }
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
