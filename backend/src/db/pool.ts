import pg from "pg";

let pool: pg.Pool | null = null;

export function getPool(connectionString: string | undefined): pg.Pool | null {
  if (!connectionString) return null;
  if (!pool) {
    pool = new pg.Pool({ connectionString });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
