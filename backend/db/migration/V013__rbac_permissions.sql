-- RBAC v2: permissions catalog, role defaults, per-user overrides, invite linkage.
-- Requires V012 applied (enum value super_admin exists).

CREATE TABLE public.permissions (
  id bigint NOT NULL,
  key character varying(100) NOT NULL,
  module character varying(50) NOT NULL,
  description text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.permissions_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;
ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);
ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_key_key UNIQUE (key);

CREATE TABLE public.role_permissions (
  id bigint NOT NULL,
  role public.user_role NOT NULL,
  permission_id bigint NOT NULL,
  allowed boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.role_permissions_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;
ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);
ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_role_permission_id_key UNIQUE (role, permission_id);

CREATE TABLE public.user_permissions (
  id bigint NOT NULL,
  user_id bigint NOT NULL,
  permission_id bigint NOT NULL,
  allowed boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.user_permissions_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;
ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);
ALTER TABLE ONLY public.user_permissions ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_permissions ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_permissions ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_permissions ADD CONSTRAINT user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id);

ALTER TABLE public.user_invites
  ADD COLUMN IF NOT EXISTS user_id bigint;

ALTER TABLE ONLY public.user_invites
  ADD CONSTRAINT user_invites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions (role);

INSERT INTO public.permissions (key, module, description) VALUES
  ('settings.access', 'settings', 'Access Settings area'),
  ('team_members.view', 'team_members', 'View team member list'),
  ('team_members.create', 'team_members', 'Create team members directly'),
  ('team_members.invite', 'team_members', 'Invite team members by email'),
  ('team_members.edit', 'team_members', 'Edit team member profile and assignments'),
  ('team_members.delete', 'team_members', 'Deactivate or remove team members'),
  ('team_members.assign_permissions', 'team_members', 'Change permission overrides for users'),
  ('team_members.assign_projects', 'team_members', 'Assign users to projects'),
  ('clients.view', 'clients', 'View clients'),
  ('clients.create', 'clients', 'Create clients'),
  ('clients.edit', 'clients', 'Edit clients'),
  ('clients.archive', 'clients', 'Archive or restore clients'),
  ('clients.delete_permanent', 'clients', 'Permanently delete clients'),
  ('documents.view', 'documents', 'View stored files'),
  ('documents.upload', 'documents', 'Upload stored files'),
  ('documents.delete', 'documents', 'Delete stored files'),
  ('document_rules.view', 'document_rules', 'View document rules'),
  ('document_rules.manage', 'document_rules', 'Create, update, or delete document rules')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, allowed)
SELECT 'admin'::public.user_role, p.id, true
FROM public.permissions p
WHERE p.key <> 'team_members.assign_permissions'
ON CONFLICT ON CONSTRAINT role_permissions_role_permission_id_key DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, allowed)
SELECT 'coordinator'::public.user_role, p.id, true
FROM public.permissions p
WHERE p.key IN (
  'clients.view', 'clients.create', 'clients.edit', 'clients.archive',
  'documents.view', 'documents.upload', 'documents.delete',
  'document_rules.view'
)
ON CONFLICT ON CONSTRAINT role_permissions_role_permission_id_key DO NOTHING;

UPDATE public.users SET role = 'super_admin'::public.user_role, updated_at = now()
WHERE id = 1 AND role = 'admin'::public.user_role;
