-- Dev seed: CRM file pool expects projects.id = 1 (see CRM_VAULT_PROJECT_ID). Idempotent if rows already exist.
INSERT INTO public.clients (id, name, status, created_at, updated_at)
VALUES (1, 'CRM Seed Client', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, email, password_hash, role, status, created_at, updated_at)
VALUES (1, 'Dev User', 'dev@localhost', 'not-set-change-me', 'admin', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, name, client_id, transaction_type, stage, property_address, created_at, updated_at)
VALUES (1, 'CRM Document Library', 1, 'listing', 'listing_prep', 'N/A (CRM pool)', now(), now())
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.clients', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.clients));
SELECT setval(pg_get_serial_sequence('public.users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.users));
SELECT setval(pg_get_serial_sequence('public.projects', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.projects));
