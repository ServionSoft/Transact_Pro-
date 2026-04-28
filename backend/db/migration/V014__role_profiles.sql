-- Named permission profiles + users.role_profile_id. Requires V013 (permissions / RBAC).

CREATE TABLE public.role_profiles (
  id bigint NOT NULL,
  name character varying(120) NOT NULL,
  description text,
  is_system boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at timestamp with time zone
);

CREATE SEQUENCE public.role_profiles_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.role_profiles_id_seq OWNED BY public.role_profiles.id;
ALTER TABLE ONLY public.role_profiles ALTER COLUMN id SET DEFAULT nextval('public.role_profiles_id_seq'::regclass);
ALTER TABLE ONLY public.role_profiles ADD CONSTRAINT role_profiles_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX role_profiles_name_active_lower ON public.role_profiles (lower(name::text))
  WHERE deleted_at IS NULL;

CREATE TABLE public.role_profile_permissions (
  id bigint NOT NULL,
  role_profile_id bigint NOT NULL,
  permission_id bigint NOT NULL,
  allowed boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.role_profile_permissions_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER SEQUENCE public.role_profile_permissions_id_seq OWNED BY public.role_profile_permissions.id;
ALTER TABLE ONLY public.role_profile_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_profile_permissions_id_seq'::regclass);
ALTER TABLE ONLY public.role_profile_permissions ADD CONSTRAINT role_profile_permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.role_profile_permissions
  ADD CONSTRAINT role_profile_permissions_role_profile_id_fkey FOREIGN KEY (role_profile_id) REFERENCES public.role_profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_profile_permissions
  ADD CONSTRAINT role_profile_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.role_profile_permissions
  ADD CONSTRAINT role_profile_permissions_role_profile_id_permission_id_key UNIQUE (role_profile_id, permission_id);

CREATE INDEX idx_role_profile_permissions_profile ON public.role_profile_permissions (role_profile_id);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role_profile_id bigint;

ALTER TABLE ONLY public.users
  ADD CONSTRAINT users_role_profile_id_fkey FOREIGN KEY (role_profile_id) REFERENCES public.role_profiles(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_users_role_profile_id ON public.users (role_profile_id);

INSERT INTO public.permissions (key, module, description) VALUES
  ('roles.manage', 'roles', 'Create, update, or delete permission profiles (named roles)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, allowed)
SELECT 'admin'::public.user_role, p.id, true
FROM public.permissions p
WHERE p.key = 'roles.manage'
ON CONFLICT ON CONSTRAINT role_permissions_role_permission_id_key DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id, allowed)
SELECT 'coordinator'::public.user_role, p.id, false
FROM public.permissions p
WHERE p.key = 'roles.manage'
ON CONFLICT ON CONSTRAINT role_permissions_role_permission_id_key DO NOTHING;

INSERT INTO public.role_profiles (name, description, is_system)
VALUES
  ('Default Admin', 'Matches built-in admin permission defaults', true),
  ('Default Coordinator', 'Matches built-in coordinator permission defaults', true);

INSERT INTO public.role_profile_permissions (role_profile_id, permission_id, allowed)
SELECT rp_prof.id, rp.permission_id, rp.allowed
FROM public.role_permissions rp
JOIN public.role_profiles rp_prof ON lower(rp_prof.name) = lower('Default Admin')
WHERE rp.role = 'admin'::public.user_role
  AND rp_prof.deleted_at IS NULL;

INSERT INTO public.role_profile_permissions (role_profile_id, permission_id, allowed)
SELECT rp_prof.id, rp.permission_id, rp.allowed
FROM public.role_permissions rp
JOIN public.role_profiles rp_prof ON lower(rp_prof.name) = lower('Default Coordinator')
WHERE rp.role = 'coordinator'::public.user_role
  AND rp_prof.deleted_at IS NULL;

UPDATE public.users u
SET role_profile_id = p.id, updated_at = now()
FROM public.role_profiles p
WHERE u.deleted_at IS NULL
  AND u.role = 'admin'::public.user_role
  AND lower(p.name) = lower('Default Admin')
  AND p.deleted_at IS NULL;

UPDATE public.users u
SET role_profile_id = p.id, updated_at = now()
FROM public.role_profiles p
WHERE u.deleted_at IS NULL
  AND u.role = 'coordinator'::public.user_role
  AND lower(p.name) = lower('Default Coordinator')
  AND p.deleted_at IS NULL;

UPDATE public.users
SET role_profile_id = NULL, updated_at = now()
WHERE role = 'super_admin'::public.user_role;
