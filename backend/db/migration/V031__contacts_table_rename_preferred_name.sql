-- CRM: rename legacy public.contacts (party-directory) then rename public.clients -> public.contacts.
-- Adds preferred_name on CRM contacts and a partial unique index on lower(email) for active rows.

-- A) Legacy party-directory table (full_name + contact_role) — keep data, free the name "contacts"
ALTER TABLE public.contacts RENAME TO transaction_party_contacts;

ALTER TABLE public.transaction_party_contacts
  RENAME CONSTRAINT contacts_pkey TO transaction_party_contacts_pkey;

ALTER SEQUENCE public.contacts_id_seq RENAME TO transaction_party_contacts_id_seq;

ALTER TABLE public.transaction_party_contacts
  ALTER COLUMN id SET DEFAULT nextval('public.transaction_party_contacts_id_seq'::regclass);

ALTER TABLE public.transaction_party_contacts
  RENAME CONSTRAINT contacts_created_by_user_id_fkey TO transaction_party_contacts_created_by_user_id_fkey;

-- B) CRM persons (was clients) -> contacts
ALTER TABLE public.clients RENAME TO contacts;

ALTER TABLE public.contacts
  RENAME CONSTRAINT clients_pkey TO contacts_pkey;

ALTER SEQUENCE public.clients_id_seq RENAME TO contacts_id_seq;

ALTER TABLE public.contacts
  ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);

ALTER TABLE public.contacts
  RENAME CONSTRAINT clients_created_by_user_id_fkey TO contacts_created_by_user_id_fkey;

-- C) Preferred display name (legal name stays in name)
ALTER TABLE public.contacts
  ADD COLUMN preferred_name character varying(255);

-- D) Prevent duplicate active contacts by email (case-insensitive)
CREATE UNIQUE INDEX contacts_email_lower_active_uq
  ON public.contacts (lower(btrim(email::text)))
  WHERE deleted_at IS NULL AND email IS NOT NULL AND btrim(email::text) <> '';
