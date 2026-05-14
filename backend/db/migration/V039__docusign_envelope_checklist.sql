-- When an e-sign template lives on the CRM vault project but the envelope is sent from a
-- transaction checklist row, store that context so DocuSign Connect / import can update the
-- correct project_documents row and attach the signed PDF to the transaction.

ALTER TABLE public.docusign_envelopes
  ADD COLUMN IF NOT EXISTS checklist_project_id bigint NULL,
  ADD COLUMN IF NOT EXISTS checklist_project_document_id bigint NULL;

ALTER TABLE public.docusign_envelopes
  DROP CONSTRAINT IF EXISTS docusign_envelopes_checklist_project_id_fkey;

ALTER TABLE public.docusign_envelopes
  ADD CONSTRAINT docusign_envelopes_checklist_project_id_fkey
  FOREIGN KEY (checklist_project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.docusign_envelopes
  DROP CONSTRAINT IF EXISTS docusign_envelopes_checklist_project_document_id_fkey;

ALTER TABLE public.docusign_envelopes
  ADD CONSTRAINT docusign_envelopes_checklist_project_document_id_fkey
  FOREIGN KEY (checklist_project_document_id) REFERENCES public.project_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_docusign_envelopes_checklist
  ON public.docusign_envelopes (checklist_project_id, checklist_project_document_id)
  WHERE checklist_project_document_id IS NOT NULL;
