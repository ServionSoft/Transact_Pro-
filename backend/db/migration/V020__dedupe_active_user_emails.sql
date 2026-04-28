-- One-time data hygiene:
-- if historical duplicates exist for active users (same email, deleted_at IS NULL),
-- keep the newest row and soft-deactivate older duplicates.

WITH ranked AS (
  SELECT
    id,
    LOWER(email) AS normalized_email,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(email)
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.users
  WHERE deleted_at IS NULL
),
to_deactivate AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE public.users u
SET
  deleted_at = now(),
  status = 'inactive'::public.user_status,
  updated_at = now()
FROM to_deactivate d
WHERE u.id = d.id;
