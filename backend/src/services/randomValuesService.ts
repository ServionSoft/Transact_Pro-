import type { Pool } from "pg";
import { randomUUID } from "node:crypto";

export type RandomValueRow = {
  id: number;
  value: string;
  createdAt: string;
  updatedAt: string;
};

type DbRow = {
  id: string | number;
  value: string;
  created_at: Date | string;
  updated_at: Date | string;
};

function mapRow(row: DbRow): RandomValueRow {
  return {
    id: Number(row.id),
    value: row.value,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function insertRandomValue(pool: Pool): Promise<RandomValueRow> {
  const value = randomUUID();
  const { rows } = await pool.query<DbRow>(
    `INSERT INTO public.random_values (value)
     VALUES ($1)
     RETURNING id, value, created_at, updated_at`,
    [value]
  );
  return mapRow(rows[0]);
}

export async function listRandomValues(pool: Pool, limit = 50): Promise<RandomValueRow[]> {
  const safeLimit = Math.min(Math.max(1, Math.trunc(limit)), 200);
  const { rows } = await pool.query<DbRow>(
    `SELECT id, value, created_at, updated_at
     FROM public.random_values
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return rows.map(mapRow);
}
