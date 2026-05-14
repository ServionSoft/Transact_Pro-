import type { Pool } from "pg";

export type EsignSettingsRow = {
  vendorName: string;
  vendorEmail: string;
  vendorSignatureFileId: string | null;
  updatedAt: string;
};

export type EsignSettingsUpsertInput = {
  vendorName: string;
  vendorEmail: string;
  vendorSignatureFileId: number | null;
};

function mapRow(row: {
  vendor_name: string;
  vendor_email: string;
  vendor_signature_file_id: string | null;
  updated_at: Date;
}): EsignSettingsRow {
  return {
    vendorName: row.vendor_name ?? "",
    vendorEmail: row.vendor_email ?? "",
    vendorSignatureFileId: row.vendor_signature_file_id,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getEsignSettings(pool: Pool): Promise<EsignSettingsRow> {
  const { rows } = await pool.query<{
    vendor_name: string;
    vendor_email: string;
    vendor_signature_file_id: string | null;
    updated_at: Date;
  }>(
    `SELECT vendor_name, vendor_email, vendor_signature_file_id::text AS vendor_signature_file_id, updated_at
     FROM public.esign_settings
     WHERE id = 1
     LIMIT 1`
  );
  const row = rows[0];
  if (!row) {
    throw new Error("eSign settings row is missing. Apply database migrations (esign_settings).");
  }
  return mapRow(row);
}

export async function upsertEsignSettings(pool: Pool, input: EsignSettingsUpsertInput): Promise<EsignSettingsRow> {
  const vendorName = input.vendorName.trim().slice(0, 255);
  const vendorEmail = input.vendorEmail.trim().toLowerCase().slice(0, 512);
  const vendorSignatureFileId = input.vendorSignatureFileId;
  const { rows } = await pool.query<{
    vendor_name: string;
    vendor_email: string;
    vendor_signature_file_id: string | null;
    updated_at: Date;
  }>(
    `UPDATE public.esign_settings
     SET vendor_name = $1,
         vendor_email = $2,
         vendor_signature_file_id = $3::bigint,
         updated_at = now()
     WHERE id = 1
     RETURNING vendor_name, vendor_email, vendor_signature_file_id::text AS vendor_signature_file_id, updated_at`,
    [vendorName, vendorEmail, vendorSignatureFileId]
  );
  const row = rows[0];
  if (!row) throw new Error("Could not save eSign settings.");
  return mapRow(row);
}

