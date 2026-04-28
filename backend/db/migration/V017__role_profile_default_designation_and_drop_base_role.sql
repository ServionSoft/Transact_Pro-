-- Replace legacy account-level (`base_role`) with profile default designation text.
-- Also expand permission catalog for full CRM coverage.

ALTER TABLE public.role_profiles
  ADD COLUMN IF NOT EXISTS default_designation text;

UPDATE public.role_profiles
SET default_designation = CASE
  WHEN lower(name) = lower('Default Admin') THEN 'Admin'
  WHEN lower(name) = lower('Default Coordinator') THEN 'Coordinator'
  ELSE name
END
WHERE deleted_at IS NULL
  AND (default_designation IS NULL OR btrim(default_designation) = '');

ALTER TABLE public.role_profiles
  DROP CONSTRAINT IF EXISTS role_profiles_base_role_check;

ALTER TABLE public.role_profiles
  DROP COLUMN IF EXISTS base_role;

INSERT INTO public.permissions (key, module, description) VALUES
  ('settings.manage_general', 'settings', 'Manage general organization settings'),
  ('settings.manage_integrations', 'settings', 'Manage third-party integrations'),
  ('projects.view', 'projects', 'View projects'),
  ('projects.create', 'projects', 'Create projects'),
  ('projects.edit', 'projects', 'Edit projects'),
  ('projects.archive', 'projects', 'Archive projects'),
  ('projects.restore', 'projects', 'Restore archived projects'),
  ('projects.delete', 'projects', 'Delete projects'),
  ('projects.assign_members', 'projects', 'Assign members to projects'),
  ('projects.reassign_owner', 'projects', 'Reassign project owners')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, allowed)
SELECT 'admin'::public.user_role, p.id, true
FROM public.permissions p
WHERE p.key IN (
  'settings.manage_general',
  'settings.manage_integrations',
  'projects.view',
  'projects.create',
  'projects.edit',
  'projects.archive',
  'projects.restore',
  'projects.delete',
  'projects.assign_members',
  'projects.reassign_owner'
)
ON CONFLICT ON CONSTRAINT role_permissions_role_permission_id_key DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, allowed)
SELECT 'coordinator'::public.user_role, p.id, true
FROM public.permissions p
WHERE p.key IN (
  'projects.view',
  'projects.create',
  'projects.edit',
  'projects.archive',
  'projects.restore',
  'projects.assign_members'
)
ON CONFLICT ON CONSTRAINT role_permissions_role_permission_id_key DO NOTHING;
