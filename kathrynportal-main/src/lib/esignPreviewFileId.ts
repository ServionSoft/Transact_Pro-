import type { EsignDocumentDto } from "@/api/esign";

/** Preview/send from the clean upload unless a separate office→PDF render copy exists. */
export function esignPreviewFileId(doc: Pick<EsignDocumentDto, "originalFileId" | "renderFileId">): string {
  if (doc.renderFileId && doc.renderFileId !== doc.originalFileId) {
    return doc.renderFileId;
  }
  return doc.originalFileId;
}
