-- CRM contacts: add first_name / last_name alongside the combined name.
-- The combined `name` stays the source for display/sort/tokens; first/last are the
-- reliable parts for email personalization. Backfill splits existing name best-effort
-- (first token -> first_name, remainder -> last_name).

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_name character varying(255);

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS last_name character varying(255);

UPDATE public.contacts
SET first_name = CASE
                   WHEN position(' ' in btrim(name)) > 0
                     THEN split_part(btrim(name), ' ', 1)
                   ELSE btrim(name)
                 END,
    last_name = CASE
                  WHEN position(' ' in btrim(name)) > 0
                    THEN btrim(substring(btrim(name) from position(' ' in btrim(name)) + 1))
                  ELSE ''
                END
WHERE name IS NOT NULL
  AND btrim(name) <> ''
  AND (first_name IS NULL OR btrim(coalesce(first_name, '')) = '');
