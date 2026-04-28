import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing in backend/.env");
  }
  const email = (process.env.ADMIN_SEED_EMAIL || "admin@transactpro.local").trim();
  const name = (process.env.ADMIN_SEED_NAME || "System Admin").trim();
  const password = process.env.ADMIN_SEED_PASSWORD?.trim();
  if (!password) {
    throw new Error("ADMIN_SEED_PASSWORD is required in backend/.env for db:seed:admin-user");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO public.users (name, email, password_hash, role, status, joined_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'super_admin'::public.user_role, 'active'::public.user_status, now(), now(), now())
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = 'super_admin'::public.user_role,
             status = 'active'::public.user_status,
             updated_at = now()`,
      [name, email, hash]
    );
    // eslint-disable-next-line no-console
    console.log(`Super admin user upserted: ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
