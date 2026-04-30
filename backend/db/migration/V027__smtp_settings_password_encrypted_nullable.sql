-- Match V024: ciphertext column is optional. Some DBs ended up NOT NULL; allow NULL again.
ALTER TABLE public.smtp_settings ALTER COLUMN password_encrypted DROP NOT NULL;
