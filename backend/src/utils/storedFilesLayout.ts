import path from "node:path";

/** Root segment under UPLOAD_DIR for CRM transaction files. */
export const DOC_UPLOAD_SEGMENT = "doc_upload";

/** Staging directory under DOC_UPLOAD_SEGMENT (multer writes here first). */
export const DOC_UPLOAD_STAGING = ".staging";

/** Subfolder for files with no project_folders row (inbox / unfiled). */
export const DOC_UPLOAD_INBOX = "inbox";

export function filedSubPath(folderId: number): string {
  return path.posix.join("folders", String(folderId));
}

/**
 * Relative path under UPLOAD_DIR (POSIX, forward slashes for DB + joins).
 * e.g. doc_upload/1/inbox/<uuid>.pdf or doc_upload/1/folders/2/<uuid>.pdf
 */
export function storageKeyFor(
  projectId: number,
  folderId: number | null,
  filename: string
): string {
  const sub =
    folderId === null || folderId === undefined
      ? DOC_UPLOAD_INBOX
      : filedSubPath(folderId);
  return path.posix.join(
    DOC_UPLOAD_SEGMENT,
    String(projectId),
    sub,
    filename
  );
}
