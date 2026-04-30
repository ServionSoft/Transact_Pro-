import fs from "node:fs";
import path from "node:path";
import type { Pool, PoolClient } from "pg";
import type { AppConfig } from "../config/env.js";
import {
  DOC_UPLOAD_SEGMENT,
  storageKeyFor,
} from "../utils/storedFilesLayout.js";

export type FileRowOut = {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  folder_id: string | null;
  created_at: string;
  uploaded_by_name: string | null;
  download_url: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toDateOnly(iso: Date): string {
  return iso.toISOString().split("T")[0];
}

function buildDownloadUrl(
  publicBase: string,
  projectIdParam: string,
  fileId: string
): string {
  const base = publicBase.replace(/\/+$/, "");
  return `${base}/api/projects/${encodeURIComponent(projectIdParam)}/stored-files/${encodeURIComponent(fileId)}/download`;
}

export async function projectExists(
  pool: Pool,
  projectId: number
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM projects WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [projectId]
  );
  return rows.length > 0;
}

export async function folderBelongsToProject(
  pool: Pool,
  projectId: number,
  folderId: number
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM project_folders WHERE id = $1 AND project_id = $2 LIMIT 1`,
    [folderId, projectId]
  );
  return rows.length > 0;
}

export async function listFolders(
  pool: Pool,
  projectId: number
): Promise<{ id: string; name: string; parent_id: string | null }[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>(
    `SELECT id::text, name, parent_folder_id::text
     FROM project_folders
     WHERE project_id = $1
     ORDER BY name ASC`,
    [projectId]
  );
  return rows.map((r: { id: string; name: string; parent_folder_id: string | null }) => ({
    id: r.id,
    name: r.name,
    parent_id: r.parent_folder_id,
  }));
}

export async function listFiles(
  pool: Pool,
  projectId: number,
  publicBase: string,
  projectIdParam: string
): Promise<FileRowOut[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    size_bytes: string;
    mime_type: string;
    folder_id: string | null;
    created_at: Date;
    uploaded_by_name: string | null;
  }>(
    `SELECT sf.id::text,
            sf.name,
            sf.size_bytes::text,
            sf.mime_type,
            sf.folder_id::text,
            sf.created_at,
            u.name AS uploaded_by_name
     FROM stored_files sf
     LEFT JOIN users u ON u.id = sf.uploaded_by_user_id AND u.deleted_at IS NULL
     WHERE sf.project_id = $1
       AND sf.deleted_at IS NULL
       AND sf.storage_scope = 'transaction'
     ORDER BY sf.created_at DESC`,
    [projectId]
  );

  return rows.map(
    (r: {
      id: string;
      name: string;
      size_bytes: string;
      mime_type: string;
      folder_id: string | null;
      created_at: Date;
      uploaded_by_name: string | null;
    }) => ({
      id: r.id,
      name: r.name,
      size_bytes: Number(r.size_bytes),
      mime_type: r.mime_type,
      folder_id: r.folder_id,
      created_at: r.created_at.toISOString(),
      uploaded_by_name: r.uploaded_by_name,
      download_url: buildDownloadUrl(publicBase, projectIdParam, r.id),
    })
  );
}

export function mapFileToApiPayload(row: FileRowOut): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    size_bytes: row.size_bytes,
    size_display: formatFileSize(row.size_bytes),
    mime_type: row.mime_type,
    folder_id: row.folder_id,
    created_at: row.created_at,
    uploaded_at: toDateOnly(new Date(row.created_at)),
    uploaded_by_name: row.uploaded_by_name ?? "—",
    download_url: row.download_url,
  };
}

export async function insertStoredFile(
  client: PoolClient,
  params: {
    projectId: number;
    folderId: number | null;
    displayName: string;
    storageKey: string;
    sizeBytes: number;
    mimeType: string;
    uploadedByUserId: number | null;
  }
): Promise<FileRowOut> {
  const { rows } = await client.query<{
    id: string;
    name: string;
    size_bytes: string;
    mime_type: string;
    folder_id: string | null;
    created_at: Date;
    uploaded_by_user_id: string | null;
  }>(
    `INSERT INTO stored_files (
       storage_scope, project_id, folder_id, google_drive_library_root_id,
       name, storage_key, size_bytes, mime_type, uploaded_by_user_id, source,
       created_at, updated_at
     ) VALUES (
       'transaction', $1, $2, NULL,
       $3, $4, $5, $6, $7, 'manual_upload',
       now(), now()
     )
     RETURNING id::text, name, size_bytes::text, mime_type, folder_id::text, created_at, uploaded_by_user_id::text`,
    [
      params.projectId,
      params.folderId,
      params.displayName,
      params.storageKey,
      params.sizeBytes,
      params.mimeType,
      params.uploadedByUserId,
    ]
  );
  const inserted = rows[0];
  let uploadedByName: string | null = null;
  if (inserted.uploaded_by_user_id) {
    const u = await client.query<{ name: string }>(
      `SELECT name FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [inserted.uploaded_by_user_id]
    );
    uploadedByName = u.rows[0]?.name ?? null;
  }
  return {
    id: inserted.id,
    name: inserted.name,
    size_bytes: Number(inserted.size_bytes),
    mime_type: inserted.mime_type,
    folder_id: inserted.folder_id,
    created_at: inserted.created_at.toISOString(),
    uploaded_by_name: uploadedByName,
    download_url: "", // filled by caller with publicBase + projectIdParam
  };
}

/** Removes the DB row and binary from disk (hard delete). */
export async function softDeleteFile(
  pool: Pool,
  projectId: number,
  fileId: number,
  uploadDirAbs: string
): Promise<boolean> {
  const { rows } = await pool.query<{ storage_key: string }>(
    `DELETE FROM stored_files
     WHERE id = $1 AND project_id = $2
     RETURNING storage_key`,
    [fileId, projectId]
  );
  const key = rows[0]?.storage_key;
  if (key) removeStoredBinary(uploadDirAbs, key);
  return rows.length > 0;
}

export type DeleteFolderResult =
  | "ok"
  | "has_children"
  | "has_files"
  | "not_found";

/** Deletes a folder row when it has no child folders and no active files reference it. */
export async function deleteProjectFolder(
  pool: Pool,
  projectId: number,
  folderId: number,
  uploadDirAbs: string
): Promise<DeleteFolderResult> {
  const { rows: childRows } = await pool.query<{ n: string }>(
    `SELECT 1 AS n FROM project_folders
     WHERE project_id = $1 AND parent_folder_id = $2 LIMIT 1`,
    [projectId, folderId]
  );
  if (childRows.length > 0) return "has_children";

  const { rows: fileRows } = await pool.query<{ n: string }>(
    `SELECT 1 AS n FROM stored_files
     WHERE project_id = $1 AND folder_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [projectId, folderId]
  );
  if (fileRows.length > 0) return "has_files";

  const { rowCount } = await pool.query(
    `DELETE FROM project_folders WHERE id = $1 AND project_id = $2`,
    [folderId, projectId]
  );
  if ((rowCount ?? 0) === 0) return "not_found";

  const folderDiskAbs = path.join(
    uploadDirAbs,
    DOC_UPLOAD_SEGMENT,
    String(projectId),
    "folders",
    String(folderId)
  );
  try {
    fs.rmSync(folderDiskAbs, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
  pruneEmptyParentsFromDir(path.dirname(folderDiskAbs), uploadDirAbs);

  return "ok";
}

/** Updates display `name` only (does not change `storage_key` on disk). */
export async function updateFileDisplayName(
  pool: Pool,
  projectId: number,
  fileId: number,
  displayName: string
): Promise<boolean> {
  const trimmed = displayName.trim();
  if (!trimmed) return false;
  const safe = trimmed.slice(0, 512);
  const { rowCount } = await pool.query(
    `UPDATE stored_files
     SET name = $1, updated_at = now()
     WHERE id = $2::bigint
       AND project_id = $3::bigint
       AND deleted_at IS NULL
       AND storage_scope = 'transaction'`,
    [safe, fileId, projectId]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateFileFolder(
  pool: Pool,
  projectId: number,
  fileId: number,
  folderId: number | null,
  uploadDirAbs: string
): Promise<boolean> {
  const client = await pool.connect();
  let renamed = false;
  let oldAbs = "";
  let newAbs = "";
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ storage_key: string }>(
      `SELECT storage_key FROM stored_files
       WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL
       FOR UPDATE`,
      [fileId, projectId]
    );
    const oldKey = rows[0]?.storage_key;
    if (!oldKey) {
      await client.query("ROLLBACK");
      return false;
    }
    const baseName = path.posix.basename(oldKey);
    const newKey = storageKeyFor(projectId, folderId, baseName);
    oldAbs = absolutePathForStorageKey(uploadDirAbs, oldKey);
    newAbs = absolutePathForStorageKey(uploadDirAbs, newKey);

    if (oldKey !== newKey) {
      if (!fs.existsSync(oldAbs)) {
        await client.query("ROLLBACK");
        return false;
      }
      fs.mkdirSync(path.dirname(newAbs), { recursive: true });
      fs.renameSync(oldAbs, newAbs);
      renamed = true;
    }

    const upd = await client.query(
      `UPDATE stored_files
       SET folder_id = $1, storage_key = $2, updated_at = now()
       WHERE id = $3 AND project_id = $4 AND deleted_at IS NULL`,
      [folderId, newKey, fileId, projectId]
    );
    if ((upd.rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      if (renamed && oldAbs && newAbs) {
        try {
          if (fs.existsSync(newAbs) && !fs.existsSync(oldAbs)) {
            fs.renameSync(newAbs, oldAbs);
          }
        } catch {
          /* ignore */
        }
      }
      return false;
    }
    await client.query("COMMIT");
    return true;
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    if (renamed && oldAbs && newAbs) {
      try {
        if (fs.existsSync(newAbs) && !fs.existsSync(oldAbs)) {
          fs.renameSync(newAbs, oldAbs);
        }
      } catch {
        /* best-effort restore */
      }
    }
    return false;
  } finally {
    client.release();
  }
}

export async function createFolder(
  pool: Pool,
  projectId: number,
  name: string,
  parentId: number | null
): Promise<{ id: string; name: string; parent_id: string | null }> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    parent_folder_id: string | null;
  }>(
    `INSERT INTO project_folders (project_id, parent_folder_id, name, is_system, created_at, updated_at)
     VALUES ($1, $2, $3, false, now(), now())
     RETURNING id::text, name, parent_folder_id::text`,
    [projectId, parentId, name.trim()]
  );
  const r = rows[0];
  return { id: r.id, name: r.name, parent_id: r.parent_folder_id };
}

export async function getFileForDownload(
  pool: Pool,
  projectId: number,
  fileId: number
): Promise<{ storage_key: string; name: string; mime_type: string } | null> {
  const { rows } = await pool.query<{
    storage_key: string;
    name: string;
    mime_type: string;
  }>(
    `SELECT storage_key, name, mime_type
     FROM stored_files
     WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`,
    [fileId, projectId]
  );
  return rows[0] ?? null;
}

export function absolutePathForStorageKey(uploadDirAbs: string, storageKey: string): string {
  if (path.isAbsolute(storageKey)) return storageKey;
  return path.join(uploadDirAbs, storageKey);
}

/** Removes empty parent directories under uploadDirAbs (stops at first non-empty or outside root). */
function pruneEmptyParentsFromDir(startDir: string, uploadRootAbs: string): void {
  let dir = path.resolve(startDir);
  const root = path.resolve(uploadRootAbs);
  for (;;) {
    const rel = path.relative(root, dir);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) break;
    try {
      fs.rmdirSync(dir);
    } catch {
      break;
    }
    dir = path.dirname(dir);
  }
}

export function removeStoredBinary(uploadDirAbs: string, storageKey: string): void {
  const abs = absolutePathForStorageKey(uploadDirAbs, storageKey);
  try {
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs);
      pruneEmptyParentsFromDir(path.dirname(abs), uploadDirAbs);
    }
  } catch {
    // best-effort cleanup
  }
}
