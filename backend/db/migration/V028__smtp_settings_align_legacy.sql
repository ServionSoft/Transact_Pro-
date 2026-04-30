-- Legacy tables: add columns the API expects; copy username -> auth_user when auth_user is empty.

ALTER TABLE public.smtp_settings ADD COLUMN IF NOT EXISTS smtp_password text;
ALTER TABLE public.smtp_settings ADD COLUMN IF NOT EXISTS from_email character varying(320) NOT NULL DEFAULT ''::character varying;
ALTER TABLE public.smtp_settings ADD COLUMN IF NOT EXISTS from_name character varying(200) NOT NULL DEFAULT ''::character varying;
ALTER TABLE public.smtp_settings ADD COLUMN IF NOT EXISTS auth_user character varying(320) NOT NULL DEFAULT ''::character varying;

DO $m$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'smtp_settings' AND column_name = 'username'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'smtp_settings' AND column_name = 'auth_user'
  ) THEN
    UPDATE public.smtp_settings
    SET auth_user = username
    WHERE (auth_user IS NULL OR btrim(auth_user) = '')
      AND username IS NOT NULL
      AND btrim(username::text) <> '';
  END IF;
END $m$;
