-- Phase 2: live DocuSign envelopes linked to e-sign templates

ALTER TABLE public.esign_documents DROP CONSTRAINT IF EXISTS esign_documents_status_check;

ALTER TABLE public.esign_documents ADD CONSTRAINT esign_documents_status_check CHECK (
  status IN (
    'draft_uploaded',
    'editing',
    'ready_for_send',
    'conversion_failed',
    'sent',
    'completed',
    'declined',
    'voided'
  )
);

ALTER TABLE public.docusign_envelopes
  ADD COLUMN IF NOT EXISTS esign_document_id bigint,
  ADD COLUMN IF NOT EXISTS signed_stored_file_id bigint;

ALTER TABLE ONLY public.docusign_envelopes
  DROP CONSTRAINT IF EXISTS docusign_envelopes_esign_document_id_fkey;

ALTER TABLE ONLY public.docusign_envelopes
  ADD CONSTRAINT docusign_envelopes_esign_document_id_fkey
  FOREIGN KEY (esign_document_id) REFERENCES public.esign_documents(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.docusign_envelopes
  DROP CONSTRAINT IF EXISTS docusign_envelopes_signed_stored_file_id_fkey;

ALTER TABLE ONLY public.docusign_envelopes
  ADD CONSTRAINT docusign_envelopes_signed_stored_file_id_fkey
  FOREIGN KEY (signed_stored_file_id) REFERENCES public.stored_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_docusign_envelopes_esign_document_id ON public.docusign_envelopes(esign_document_id);
CREATE INDEX IF NOT EXISTS idx_docusign_envelopes_docusign_envelope_id ON public.docusign_envelopes(docusign_envelope_id);

ALTER TABLE public.docusign_envelope_documents
  ALTER COLUMN project_document_id DROP NOT NULL;

DO $do$ BEGIN
  ALTER TYPE public.docusign_field_role ADD VALUE 'vendor';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $do$;

DO $do$ BEGIN
  ALTER TYPE public.docusign_field_role ADD VALUE 'client';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $do$;
