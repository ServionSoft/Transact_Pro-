-- Align SMTP username column with API (auth_user). Fixes DBs created without this column or under a legacy name.

DO $fix$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'smtp_settings'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'smtp_settings' AND column_name = 'auth_user'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'smtp_settings' AND column_name = 'smtp_username'
    ) THEN
      ALTER TABLE public.smtp_settings RENAME COLUMN smtp_username TO auth_user;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'smtp_settings' AND column_name = 'smtp_user'
    ) THEN
      ALTER TABLE public.smtp_settings RENAME COLUMN smtp_user TO auth_user;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'smtp_settings' AND column_name = 'username'
    ) THEN
      ALTER TABLE public.smtp_settings RENAME COLUMN username TO auth_user;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'smtp_settings' AND column_name = 'user'
    ) THEN
      ALTER TABLE public.smtp_settings RENAME COLUMN "user" TO auth_user;
    ELSE
      ALTER TABLE public.smtp_settings ADD COLUMN auth_user character varying(320) NOT NULL DEFAULT ''::character varying;
    END IF;
  END IF;
END $fix$;
