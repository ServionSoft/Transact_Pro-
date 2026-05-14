-- Align Phase 1 e-sign drafts with DocuSign-style tabs:
-- - page_number is 1-based
-- - one vendor + one client recipient per draft

ALTER TABLE public.esign_document_fields
  DROP CONSTRAINT IF EXISTS esign_document_fields_type_check;

ALTER TABLE public.esign_document_fields
  ADD CONSTRAINT esign_document_fields_type_check CHECK (
    field_type IN ('signature', 'initials', 'text', 'date', 'checkbox')
  );

ALTER TABLE public.esign_document_fields
  DROP CONSTRAINT IF EXISTS esign_document_fields_page_check;

-- Backfill legacy drafts that used 0-based pages.
UPDATE public.esign_document_fields
  SET page_number = 1
  WHERE page_number < 1;

ALTER TABLE public.esign_document_fields
  ADD CONSTRAINT esign_document_fields_page_check CHECK (page_number >= 1);

-- Ensure only one vendor and one client recipient per draft.
CREATE UNIQUE INDEX IF NOT EXISTS esign_recipients_document_role_uidx
  ON public.esign_document_recipients (esign_document_id, role);

-- Helpful: keep coords sane (DocuSign uses pixels/points at 72 dpi; non-negative)
ALTER TABLE public.esign_document_fields
  DROP CONSTRAINT IF EXISTS esign_document_fields_coords_check;

ALTER TABLE public.esign_document_fields
  ADD CONSTRAINT esign_document_fields_coords_check CHECK (
    x >= 0 AND y >= 0 AND width > 0 AND height > 0
  );
