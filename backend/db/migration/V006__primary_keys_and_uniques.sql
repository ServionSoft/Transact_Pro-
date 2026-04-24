-- Generated from DB/schema_live.sql. Regenerate: npm run db:migrate:generate

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.conditional_rule_documents
    ADD CONSTRAINT conditional_rule_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.conditional_rule_documents
    ADD CONSTRAINT conditional_rule_documents_rule_id_document_type_id_key UNIQUE (rule_id, document_type_id);

ALTER TABLE ONLY public.conditional_rule_sets
    ADD CONSTRAINT conditional_rule_sets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.conditional_rule_sets
    ADD CONSTRAINT conditional_rule_sets_rule_id_document_set_id_key UNIQUE (rule_id, document_set_id);

ALTER TABLE ONLY public.conditional_rules
    ADD CONSTRAINT conditional_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_set_members
    ADD CONSTRAINT document_set_members_document_set_id_document_type_id_key UNIQUE (document_set_id, document_type_id);

ALTER TABLE ONLY public.document_set_members
    ADD CONSTRAINT document_set_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_sets
    ADD CONSTRAINT document_sets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_code_key UNIQUE (code);

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_envelope_id_project_document_id_key UNIQUE (envelope_id, project_document_id);

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.docusign_envelope_recipients
    ADD CONSTRAINT docusign_envelope_recipients_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.docusign_envelopes
    ADD CONSTRAINT docusign_envelopes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.docusign_template_fields
    ADD CONSTRAINT docusign_template_fields_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_document_type_id_key UNIQUE (document_type_id);

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.docusign_webhook_events
    ADD CONSTRAINT docusign_webhook_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.google_drive_library_roots
    ADD CONSTRAINT google_drive_library_roots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_project_id_user_id_key UNIQUE (project_id, user_id);

ALTER TABLE ONLY public.project_deadlines
    ADD CONSTRAINT project_deadlines_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_unique_file UNIQUE (project_document_id, stored_file_id);

ALTER TABLE ONLY public.project_document_notes
    ADD CONSTRAINT project_document_notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_folders
    ADD CONSTRAINT project_folders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_folders
    ADD CONSTRAINT project_folders_project_id_parent_folder_id_name_key UNIQUE (project_id, parent_folder_id, name);

ALTER TABLE ONLY public.project_parties
    ADD CONSTRAINT project_parties_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_parties
    ADD CONSTRAINT project_parties_project_id_contact_id_party_role_key UNIQUE (project_id, contact_id, party_role);

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reminder_drafts
    ADD CONSTRAINT reminder_drafts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_token_key UNIQUE (token);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
