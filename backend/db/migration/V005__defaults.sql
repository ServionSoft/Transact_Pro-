-- Generated from DB/schema_live.sql. Regenerate: npm run db:migrate:generate

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);

ALTER TABLE ONLY public.conditional_rule_documents ALTER COLUMN id SET DEFAULT nextval('public.conditional_rule_documents_id_seq'::regclass);

ALTER TABLE ONLY public.conditional_rule_sets ALTER COLUMN id SET DEFAULT nextval('public.conditional_rule_sets_id_seq'::regclass);

ALTER TABLE ONLY public.conditional_rules ALTER COLUMN id SET DEFAULT nextval('public.conditional_rules_id_seq'::regclass);

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);

ALTER TABLE ONLY public.document_set_members ALTER COLUMN id SET DEFAULT nextval('public.document_set_members_id_seq'::regclass);

ALTER TABLE ONLY public.document_sets ALTER COLUMN id SET DEFAULT nextval('public.document_sets_id_seq'::regclass);

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);

ALTER TABLE ONLY public.docusign_envelope_documents ALTER COLUMN id SET DEFAULT nextval('public.docusign_envelope_documents_id_seq'::regclass);

ALTER TABLE ONLY public.docusign_envelope_recipients ALTER COLUMN id SET DEFAULT nextval('public.docusign_envelope_recipients_id_seq'::regclass);

ALTER TABLE ONLY public.docusign_envelopes ALTER COLUMN id SET DEFAULT nextval('public.docusign_envelopes_id_seq'::regclass);

ALTER TABLE ONLY public.docusign_template_fields ALTER COLUMN id SET DEFAULT nextval('public.docusign_template_fields_id_seq'::regclass);

ALTER TABLE ONLY public.docusign_templates ALTER COLUMN id SET DEFAULT nextval('public.docusign_templates_id_seq'::regclass);

ALTER TABLE ONLY public.docusign_webhook_events ALTER COLUMN id SET DEFAULT nextval('public.docusign_webhook_events_id_seq'::regclass);

ALTER TABLE ONLY public.google_drive_library_roots ALTER COLUMN id SET DEFAULT nextval('public.google_drive_library_roots_id_seq'::regclass);

ALTER TABLE ONLY public.project_assignments ALTER COLUMN id SET DEFAULT nextval('public.project_assignments_id_seq'::regclass);

ALTER TABLE ONLY public.project_deadlines ALTER COLUMN id SET DEFAULT nextval('public.project_deadlines_id_seq'::regclass);

ALTER TABLE ONLY public.project_document_files ALTER COLUMN id SET DEFAULT nextval('public.project_document_files_id_seq'::regclass);

ALTER TABLE ONLY public.project_document_notes ALTER COLUMN id SET DEFAULT nextval('public.project_document_notes_id_seq'::regclass);

ALTER TABLE ONLY public.project_documents ALTER COLUMN id SET DEFAULT nextval('public.project_documents_id_seq'::regclass);

ALTER TABLE ONLY public.project_folders ALTER COLUMN id SET DEFAULT nextval('public.project_folders_id_seq'::regclass);

ALTER TABLE ONLY public.project_parties ALTER COLUMN id SET DEFAULT nextval('public.project_parties_id_seq'::regclass);

ALTER TABLE ONLY public.project_tasks ALTER COLUMN id SET DEFAULT nextval('public.project_tasks_id_seq'::regclass);

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);

ALTER TABLE ONLY public.reminder_drafts ALTER COLUMN id SET DEFAULT nextval('public.reminder_drafts_id_seq'::regclass);

ALTER TABLE ONLY public.stored_files ALTER COLUMN id SET DEFAULT nextval('public.stored_files_id_seq'::regclass);

ALTER TABLE ONLY public.user_invites ALTER COLUMN id SET DEFAULT nextval('public.user_invites_id_seq'::regclass);

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
