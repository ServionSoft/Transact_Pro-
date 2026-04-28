-- Remove residual admin/coordinator tier reliance:
-- all non-super users are normalized to coordinator role.

UPDATE public.users
SET role = 'coordinator'::public.user_role,
    updated_at = now()
WHERE role <> 'super_admin'::public.user_role;
