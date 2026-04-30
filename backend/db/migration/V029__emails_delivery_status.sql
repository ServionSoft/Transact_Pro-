DO $$
BEGIN
  CREATE TYPE public.email_delivery_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS delivery_status public.email_delivery_status NOT NULL DEFAULT 'sent';

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS delivery_error text;

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS smtp_message_id character varying(255);
