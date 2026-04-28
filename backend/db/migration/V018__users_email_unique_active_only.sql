-- Allow reusing an email after soft-delete by enforcing uniqueness only for active (non-deleted) users.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_email_key;

DROP INDEX IF EXISTS public.users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_unique
  ON public.users (LOWER(email))
  WHERE deleted_at IS NULL;
