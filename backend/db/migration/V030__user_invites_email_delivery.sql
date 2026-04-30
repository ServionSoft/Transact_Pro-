DO $$
BEGIN
  CREATE TYPE public.invite_email_delivery_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.user_invites
  ADD COLUMN IF NOT EXISTS invite_email_status public.invite_email_delivery_status;

ALTER TABLE public.user_invites
  ADD COLUMN IF NOT EXISTS invite_email_error text;

ALTER TABLE public.user_invites
  ADD COLUMN IF NOT EXISTS invite_email_sent_at timestamp with time zone;
