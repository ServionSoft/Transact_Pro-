/**
 * Stored file pool — HTTP helpers for when `VITE_API_URL` is set.
 *
 * Expected backend routes (adjust server to match, or change paths here).
 * The Documents page uses `projectId` = `crm-doc-vault` (CRM-wide library, not a transaction).
 * - GET    /api/projects/:projectId/stored-files
 * - POST   /api/projects/:projectId/stored-files   (multipart: one field `file` per request, optional `folder_id`)
 * - DELETE /api/projects/:projectId/stored-files/:fileId
 * - PATCH  /api/projects/:projectId/stored-files/:fileId  JSON { folder_id: string | null }
 * - POST   /api/projects/:projectId/file-folders   JSON { name, parent_id: string | null }
 * - DELETE /api/projects/:projectId/file-folders/:folderId
 *
 * List response: flexible JSON — unwrap `{ success, data }`, then any of:
 * `{ files, folders }`, `{ attachments, fileFolders }`, or a bare `files` array.
 */

import { getApiBaseUrl } from "@/lib/apiConfig";
import type { FileAttachment, ProjectFolder } from "@/data/mockData";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public bodyText?: string
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function requireBase(): string {
  const b = getApiBaseUrl();
  if (!b) throw new Error("VITE_API_URL is not set");
  return b;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = requireBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, init);
  return res;
}

function unwrapData<T = unknown>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json && (json as { data: unknown }).data !== undefined) {
    return (json as { data: T }).data;
  }
  return json as T;
}

function parseListArrays(payload: unknown): { filesRaw: unknown[]; foldersRaw: unknown[] } {
  const inner = unwrapData(payload);
  if (Array.isArray(inner)) return { filesRaw: inner, foldersRaw: [] };
  if (!inner || typeof inner !== "object") return { filesRaw: [], foldersRaw: [] };
  const o = inner as Record<string, unknown>;
  const filesRaw =
    (Array.isArray(o.files) && o.files) ||
    (Array.isArray(o.attachments) && o.attachments) ||
    (Array.isArray(o.stored_files) && o.stored_files) ||
    [];
  const foldersRaw =
    (Array.isArray(o.folders) && o.folders) ||
    (Array.isArray(o.fileFolders) && o.fileFolders) ||
    (Array.isArray(o.project_folders) && o.project_folders) ||
    [];
  return { filesRaw, foldersRaw };
}

function mapFolderDto(raw: unknown): ProjectFolder | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = r.id != null ? String(r.id) : null;
  if (!id) return null;
  const name = String(r.name ?? "Folder");
  const parentRaw = r.parent_id ?? r.parentId;
  const parentId = parentRaw == null || parentRaw === "" ? null : String(parentRaw);
  return { id, name, parentId };
}

function mapFileDto(raw: unknown): FileAttachment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = r.id != null ? String(r.id) : null;
  if (!id) return null;
  const name = String(r.name ?? r.original_filename ?? r.filename ?? "file");
  const sizeBytes = typeof r.size_bytes === "number" ? r.size_bytes : typeof r.size === "number" ? r.size : undefined;
  const size =
    typeof r.size_display === "string"
      ? r.size_display
      : typeof r.size === "string"
        ? r.size
        : sizeBytes != null
          ? formatFileSize(sizeBytes)
          : "—";
  const uploadedBy = String(r.uploaded_by_name ?? r.uploaded_by ?? r.uploadedBy ?? "—");
  const uploadedAt = String(
    r.uploaded_at ?? r.uploadedAt ?? r.created_at ?? r.createdAt ?? new Date().toISOString().split("T")[0]
  );
  const type = String(r.mime_type ?? r.type ?? "application/octet-stream");
  const folderRaw = r.folder_id ?? r.folderId;
  const folderId = folderRaw == null || folderRaw === "" ? null : String(folderRaw);
  const downloadUrl =
    typeof r.download_url === "string"
      ? r.download_url
      : typeof r.downloadUrl === "string"
        ? r.downloadUrl
        : typeof r.url === "string"
          ? r.url
          : undefined;
  return {
    id,
    name,
    size,
    uploadedBy,
    uploadedAt,
    type,
    folderId,
    serverBacked: true,
    downloadUrl,
  };
}

export async function listProjectStoredFiles(projectId: string): Promise<{
  attachments: FileAttachment[];
  fileFolders: ProjectFolder[];
}> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/stored-files`, { method: "GET" });
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiRequestError(`List failed (${res.status})`, res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
  const { filesRaw, foldersRaw } = parseListArrays(json);
  const attachments = filesRaw.map(mapFileDto).filter(Boolean) as FileAttachment[];
  const fileFolders = foldersRaw.map(mapFolderDto).filter(Boolean) as ProjectFolder[];
  return { attachments, fileFolders };
}

export async function uploadProjectStoredFile(
  projectId: string,
  file: File,
  folderId: string | null
): Promise<FileAttachment> {
  const fd = new FormData();
  if (folderId) fd.append("folder_id", folderId);
  fd.append("file", file);
  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/stored-files`, {
    method: "POST",
    body: fd,
  });
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiRequestError(`Upload failed (${res.status})`, res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
  const data = unwrapData(json);
  let row: unknown = data;
  if (Array.isArray(data) && data.length) row = data[0];
  else if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (o.file && typeof o.file === "object") row = o.file;
    else if (Array.isArray(o.files) && o.files.length) row = o.files[0];
    else if (o.stored_file && typeof o.stored_file === "object") row = o.stored_file;
  }
  const mapped = mapFileDto(row);
  if (mapped) return mapped;
  throw new ApiRequestError("Upload succeeded but the response had no file record", res.status);
}

export async function deleteProjectStoredFile(projectId: string, fileId: string): Promise<void> {
  const res = await apiFetch(
    `/api/projects/${encodeURIComponent(projectId)}/stored-files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  );
  if (res.status === 204 || res.status === 200) return;
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiRequestError(`Delete failed (${res.status})`, res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
}

export async function patchProjectStoredFileFolder(
  projectId: string,
  fileId: string,
  folderId: string | null
): Promise<void> {
  const res = await apiFetch(
    `/api/projects/${encodeURIComponent(projectId)}/stored-files/${encodeURIComponent(fileId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: folderId }),
    }
  );
  if (res.status === 204 || res.status === 200) return;
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiRequestError(`Move failed (${res.status})`, res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
}

export async function deleteProjectFileFolder(
  projectId: string,
  folderId: string
): Promise<void> {
  const res = await apiFetch(
    `/api/projects/${encodeURIComponent(projectId)}/file-folders/${encodeURIComponent(folderId)}`,
    { method: "DELETE" }
  );
  if (res.status === 204) return;
  const json = await parseJsonSafe(res);
  let msg = `Delete folder failed (${res.status})`;
  if (json && typeof json === "object" && "error" in json) {
    const err = (json as { error?: { message?: string } }).error;
    if (err?.message) msg = err.message;
  }
  if (!res.ok) {
    throw new ApiRequestError(msg, res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
}

export async function createProjectFileFolder(
  projectId: string,
  name: string,
  parentId: string | null
): Promise<ProjectFolder> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/file-folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), parent_id: parentId }),
  });
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiRequestError(`Create folder failed (${res.status})`, res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
  const data = unwrapData(json);
  const folder = mapFolderDto(data);
  if (folder) return folder;
  throw new ApiRequestError("Create folder: invalid response", res.status);
}
