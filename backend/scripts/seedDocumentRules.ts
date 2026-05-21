/**
 * Idempotent seed: document_types, document_sets, document_set_members, conditional_rules, conditional_rule_sets, conditional_rule_documents.
 * Run from backend after migrations: npm run db:seed:document-rules
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import {
  DOCUMENT_SET_BUYER_ID,
  DOCUMENT_SET_LISTING_ID,
  SEEDED_RULES,
  STANDARD_LISTING_ROWS,
  standardBuyerRows,
  type ActionSeed,
} from "./seedDocumentRulesData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(backendRoot, ".env") });
const renderEnvPath = path.join(backendRoot, ".env.render");
if (fs.existsSync(renderEnvPath)) {
  dotenv.config({ path: renderEnvPath, override: true });
}

const RULE_IDS = SEEDED_RULES.map((r) => r.id);

function typeCodeFromMockId(mockId: string): string {
  return `dt_${mockId}`.slice(0, 64);
}

function typeCodeFromAction(a: ActionSeed): string {
  return `dt_act_${a.id}`.slice(0, 64);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env");
  }
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const typeIdByCode = new Map<string, number>();

    for (const row of STANDARD_LISTING_ROWS) {
      const [mockId, , name, , note] = row;
      const code = typeCodeFromMockId(mockId);
      const desc = note ?? null;
      const r = await client.query<{ id: number }>(
        `INSERT INTO public.document_types (code, display_name, description, is_standard_car_form, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, false, true, now(), now())
         ON CONFLICT (code) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           description = COALESCE(EXCLUDED.description, public.document_types.description),
           updated_at = now()
         RETURNING id`,
        [code, name, desc]
      );
      typeIdByCode.set(code, r.rows[0].id);
    }

    for (const rule of SEEDED_RULES) {
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
      [
        DOCUMENT_SET_LISTING_ID,
        "Standard Listing Checklist",
        "Seeded baseline listing documents (portal)",
      ]
    );
    await client.query(
      `INSERT INTO public.document_sets (id, name, description, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 2, true, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_active = true,
         updated_at = now()`,
      [
        DOCUMENT_SET_BUYER_ID,
        "Standard Buyer File Checklist",
        "Seeded baseline buyer-file documents (portal)",
      ]
    );

    await client.query(`DELETE FROM public.document_set_members WHERE document_set_id IN ($1, $2)`, [
      DOCUMENT_SET_LISTING_ID,
      DOCUMENT_SET_BUYER_ID,
    ]);

    let sort = 1;
    for (const row of STANDARD_LISTING_ROWS) {
      const [mockId, section, name, required] = row;
      const code = typeCodeFromMockId(mockId);
      const tid = typeIdByCode.get(code);
      if (tid == null) throw new Error(`Missing type ${code}`);
      await client.query(
        `INSERT INTO public.document_set_members (document_set_id, document_type_id, required, sort_order, section_label, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [DOCUMENT_SET_LISTING_ID, tid, required, sort++, section]
      );
    }

    sort = 1;
    for (const row of standardBuyerRows()) {
      const [mockId, section, , required] = row;
      const code = typeCodeFromMockId(mockId);
      const tid = typeIdByCode.get(code);
      if (tid == null) throw new Error(`Missing type ${code}`);
      await client.query(
        `INSERT INTO public.document_set_members (document_set_id, document_type_id, required, sort_order, section_label, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [DOCUMENT_SET_BUYER_ID, tid, required, sort++, section]
      );
    }

    await client.query(`DELETE FROM public.conditional_rule_sets WHERE rule_id = ANY($1::bigint[])`, [RULE_IDS]);
    await client.query(`DELETE FROM public.conditional_rule_documents WHERE rule_id = ANY($1::bigint[])`, [RULE_IDS]);
    await client.query(`DELETE FROM public.conditional_rules WHERE id = ANY($1::bigint[])`, [RULE_IDS]);

    for (const rule of SEEDED_RULES) {
      const triggersJson = JSON.stringify(rule.triggers);
      const actionsJson = rule.actions.length ? JSON.stringify(rule.actions) : null;
      await client.query(
        `INSERT INTO public.conditional_rules (
           id, name, kind, triggers_json, transaction_type, property_type, is_active, actions_json, created_at, updated_at
         ) VALUES ($1, $2, $3::public.rule_kind, $4::jsonb, $5::public.transaction_type, NULL, true, $6::jsonb, now(), now())`,
        [
          rule.id,
          rule.name,
          rule.kind,
          triggersJson,
          rule.transactionType,
          actionsJson,
        ]
      );

      if (rule.kind === "standard") {
        const setId =
          rule.transactionType === "listing"
            ? DOCUMENT_SET_LISTING_ID
            : rule.transactionType === "buyer_file"
              ? DOCUMENT_SET_BUYER_ID
              : null;
        if (setId != null) {
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
    console.log("Document rules seed completed (document_types, sets, members, conditional_rules).");
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
