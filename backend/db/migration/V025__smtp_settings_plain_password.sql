-- Store SMTP password in the database (plaintext column; never exposed on GET API).
ALTER TABLE public.smtp_settings ADD COLUMN IF NOT EXISTS smtp_password text;
