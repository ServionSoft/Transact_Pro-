-- Default escrow assistant linked from Escrow Officer CRM contact (Approach B).
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS assistant_contact_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_assistant_contact_id_fkey'
  ) THEN
    ALTER TABLE public.contacts
      ADD CONSTRAINT contacts_assistant_contact_id_fkey
      FOREIGN KEY (assistant_contact_id) REFERENCES public.contacts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS contacts_assistant_contact_id_idx
  ON public.contacts (assistant_contact_id)
  WHERE assistant_contact_id IS NOT NULL;
