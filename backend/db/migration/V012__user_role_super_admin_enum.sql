-- Add enum value in its own migration so it commits before any SQL uses `super_admin`
-- (PostgreSQL: "unsafe use of new value" if used in the same transaction as ADD VALUE).

ALTER TYPE public.user_role ADD VALUE 'super_admin';
