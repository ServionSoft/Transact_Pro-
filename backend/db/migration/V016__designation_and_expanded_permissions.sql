-- Permission-only access expansion and user designation label.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS designation text;

INSERT INTO public.permissions (key, module, description) VALUES
  ('project_access.global', 'projects', 'Access all projects without explicit assignment'),
  ('team_members.deactivate', 'team_members', 'Deactivate team members'),
  ('clients.restore', 'clients', 'Restore archived clients'),
  ('documents.download', 'documents', 'Download stored files'),
  ('documents.move', 'documents', 'Move stored files between folders'),
  ('documents.folders.create', 'documents', 'Create file folders'),
  ('documents.folders.delete', 'documents', 'Delete file folders'),
  ('document_rules.create', 'document_rules', 'Create document rules'),
  ('document_rules.edit', 'document_rules', 'Edit document rules'),
  ('document_rules.delete', 'document_rules', 'Delete document rules'),
  ('document_rules.toggle_active', 'document_rules', 'Enable or disable document rules'),
  ('role_profiles.view', 'role_profiles', 'View permission profiles'),
  ('role_profiles.create', 'role_profiles', 'Create permission profiles'),
  ('role_profiles.edit', 'role_profiles', 'Edit permission profiles'),
  ('role_profiles.delete', 'role_profiles', 'Delete permission profiles')
ON CONFLICT (key) DO NOTHING;

-- Backward compatibility for existing checks.
INSERT INTO public.role_permissions (role, permission_id, allowed)
SELECT 'admin'::public.user_role, p.id, true
FROM public.permissions p
WHERE p.key IN (
  'project_access.global',
  'team_members.deactivate',
  'clients.restore',
  'documents.download',
  'documents.move',
  'documents.folders.create',
  'documents.folders.delete',
  'document_rules.create',
  'document_rules.edit',
  'document_rules.delete',
  'document_rules.toggle_active',
  'role_profiles.view',
  'role_profiles.create',
  'role_profiles.edit',
  'role_profiles.delete'
)
ON CONFLICT ON CONSTRAINT role_permissions_role_permission_id_key DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, allowed)
SELECT 'coordinator'::public.user_role, p.id, true
FROM public.permissions p
WHERE p.key IN (
  'team_members.deactivate',
  'clients.restore',
  'documents.download',
  'documents.move',
  'documents.folders.create',
  'documents.folders.delete',
  'document_rules.create',
  'document_rules.edit',
  'document_rules.delete',
  'document_rules.toggle_active',
  'role_profiles.view'
)
ON CONFLICT ON CONSTRAINT role_permissions_role_permission_id_key DO NOTHING;

-- Backfill profile-level permissions based on previous coarse keys.
INSERT INTO public.role_profile_permissions (role_profile_id, permission_id, allowed, created_at)
SELECT rpp.role_profile_id, p_new.id, true, now()
FROM public.role_profile_permissions rpp
JOIN public.permissions p_old ON p_old.id = rpp.permission_id
JOIN public.permissions p_new ON p_new.key IN (
  CASE WHEN p_old.key = 'document_rules.manage' THEN 'document_rules.create' END,
  CASE WHEN p_old.key = 'document_rules.manage' THEN 'document_rules.edit' END,
  CASE WHEN p_old.key = 'document_rules.manage' THEN 'document_rules.delete' END,
  CASE WHEN p_old.key = 'document_rules.manage' THEN 'document_rules.toggle_active' END,
  CASE WHEN p_old.key = 'documents.upload' THEN 'documents.move' END,
  CASE WHEN p_old.key = 'documents.upload' THEN 'documents.folders.create' END,
  CASE WHEN p_old.key = 'documents.delete' THEN 'documents.folders.delete' END,
  CASE WHEN p_old.key = 'documents.view' THEN 'documents.download' END,
  CASE WHEN p_old.key = 'clients.archive' THEN 'clients.restore' END,
  CASE WHEN p_old.key = 'team_members.delete' THEN 'team_members.deactivate' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'role_profiles.view' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'role_profiles.create' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'role_profiles.edit' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'role_profiles.delete' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'project_access.global' END
)
WHERE rpp.allowed = true
ON CONFLICT ON CONSTRAINT role_profile_permissions_role_profile_id_permission_id_key DO NOTHING;

-- Backfill user-level overrides in the same way.
INSERT INTO public.user_permissions (user_id, permission_id, allowed, created_at, updated_at)
SELECT up.user_id, p_new.id, true, now(), now()
FROM public.user_permissions up
JOIN public.permissions p_old ON p_old.id = up.permission_id
JOIN public.permissions p_new ON p_new.key IN (
  CASE WHEN p_old.key = 'document_rules.manage' THEN 'document_rules.create' END,
  CASE WHEN p_old.key = 'document_rules.manage' THEN 'document_rules.edit' END,
  CASE WHEN p_old.key = 'document_rules.manage' THEN 'document_rules.delete' END,
  CASE WHEN p_old.key = 'document_rules.manage' THEN 'document_rules.toggle_active' END,
  CASE WHEN p_old.key = 'documents.upload' THEN 'documents.move' END,
  CASE WHEN p_old.key = 'documents.upload' THEN 'documents.folders.create' END,
  CASE WHEN p_old.key = 'documents.delete' THEN 'documents.folders.delete' END,
  CASE WHEN p_old.key = 'documents.view' THEN 'documents.download' END,
  CASE WHEN p_old.key = 'clients.archive' THEN 'clients.restore' END,
  CASE WHEN p_old.key = 'team_members.delete' THEN 'team_members.deactivate' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'role_profiles.view' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'role_profiles.create' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'role_profiles.edit' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'role_profiles.delete' END,
  CASE WHEN p_old.key = 'roles.manage' THEN 'project_access.global' END
)
WHERE up.allowed = true
ON CONFLICT ON CONSTRAINT user_permissions_user_id_permission_id_key DO NOTHING;
