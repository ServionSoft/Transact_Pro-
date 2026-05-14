-- Link checklist rows directly to vault e-sign layout (one esign_documents row per original_file in vault).
ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS esign_document_id bigint NULL;

ALTER TABLE public.project_documents
  DROP CONSTRAINT IF EXISTS project_documents_esign_document_id_fkey;

ALTER TABLE public.project_documents
  ADD CONSTRAINT project_documents_esign_document_id_fkey
  FOREIGN KEY (esign_document_id) REFERENCES public.esign_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_esign_document_id
  ON public.project_documents(esign_document_id)
  WHERE esign_document_id IS NOT NULL;
