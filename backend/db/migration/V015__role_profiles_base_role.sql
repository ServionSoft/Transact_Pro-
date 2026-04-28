-- Account level for each permission profile (drives users.role when a profile is assigned).

ALTER TABLE public.role_profiles
  ADD COLUMN base_role public.user_role;

UPDATE public.role_profiles
SET base_role = 'admin'::public.user_role
WHERE lower(name) = lower('Default Admin') AND deleted_at IS NULL;

UPDATE public.role_profiles
SET base_role = 'coordinator'::public.user_role
WHERE lower(name) = lower('Default Coordinator') AND deleted_at IS NULL;

UPDATE public.role_profiles
SET base_role = 'coordinator'::public.user_role
WHERE base_role IS NULL;

ALTER TABLE public.role_profiles
  ALTER COLUMN base_role SET DEFAULT 'coordinator'::public.user_role,
  ALTER COLUMN base_role SET NOT NULL;

ALTER TABLE public.role_profiles
  ADD CONSTRAINT role_profiles_base_role_check CHECK (
    base_role IN ('admin'::public.user_role, 'coordinator'::public.user_role)
  );
