-- Add vendor signature file reference for eSign (PNG).

ALTER TABLE public.smtp_settings
  ADD COLUMN IF NOT EXISTS vendor_signature_file_id bigint;

ALTER TABLE ONLY public.smtp_settings
  ADD CONSTRAINT smtp_settings_vendor_signature_file_id_fkey
  FOREIGN KEY (vendor_signature_file_id) REFERENCES public.stored_files(id) ON DELETE SET NULL;

