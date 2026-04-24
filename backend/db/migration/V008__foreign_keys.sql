-- Generated from DB/schema_live.sql. Regenerate: npm run db:migrate:generate

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.conditional_rule_documents
    ADD CONSTRAINT conditional_rule_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.conditional_rule_documents
    ADD CONSTRAINT conditional_rule_documents_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.conditional_rules(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.conditional_rule_sets
    ADD CONSTRAINT conditional_rule_sets_document_set_id_fkey FOREIGN KEY (document_set_id) REFERENCES public.document_sets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.conditional_rule_sets
    ADD CONSTRAINT conditional_rule_sets_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.conditional_rules(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.conditional_rules
    ADD CONSTRAINT conditional_rules_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.document_set_members
    ADD CONSTRAINT document_set_members_document_set_id_fkey FOREIGN KEY (document_set_id) REFERENCES public.document_sets(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.document_set_members
    ADD CONSTRAINT document_set_members_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.document_sets
    ADD CONSTRAINT document_sets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_envelope_id_fkey FOREIGN KEY (envelope_id) REFERENCES public.docusign_envelopes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_project_document_id_fkey FOREIGN KEY (project_document_id) REFERENCES public.project_documents(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.docusign_templates(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.docusign_envelope_recipients
    ADD CONSTRAINT docusign_envelope_recipients_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.docusign_envelope_recipients
    ADD CONSTRAINT docusign_envelope_recipients_envelope_id_fkey FOREIGN KEY (envelope_id) REFERENCES public.docusign_envelopes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.docusign_envelopes
    ADD CONSTRAINT docusign_envelopes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.docusign_envelopes
    ADD CONSTRAINT docusign_envelopes_sent_by_user_id_fkey FOREIGN KEY (sent_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.docusign_template_fields
    ADD CONSTRAINT docusign_template_fields_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.docusign_templates(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_pdf_reference_file_id_fkey FOREIGN KEY (pdf_reference_file_id) REFERENCES public.stored_files(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.docusign_webhook_events
    ADD CONSTRAINT docusign_webhook_events_envelope_id_fkey FOREIGN KEY (envelope_id) REFERENCES public.docusign_envelopes(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.google_drive_library_roots
    ADD CONSTRAINT google_drive_library_roots_drive_account_user_id_fkey FOREIGN KEY (drive_account_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_deadlines
    ADD CONSTRAINT project_deadlines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_docusign_envelope_document_id_fkey FOREIGN KEY (docusign_envelope_document_id) REFERENCES public.docusign_envelope_documents(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_project_document_id_fkey FOREIGN KEY (project_document_id) REFERENCES public.project_documents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_stored_file_id_fkey FOREIGN KEY (stored_file_id) REFERENCES public.stored_files(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_document_notes
    ADD CONSTRAINT project_document_notes_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.project_document_notes
    ADD CONSTRAINT project_document_notes_project_document_id_fkey FOREIGN KEY (project_document_id) REFERENCES public.project_documents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_current_file_id_fkey FOREIGN KEY (current_file_id) REFERENCES public.stored_files(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_source_document_set_id_fkey FOREIGN KEY (source_document_set_id) REFERENCES public.document_sets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.project_folders
    ADD CONSTRAINT project_folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.project_folders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_folders
    ADD CONSTRAINT project_folders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_parties
    ADD CONSTRAINT project_parties_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.project_parties
    ADD CONSTRAINT project_parties_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_escrow_officer_contact_id_fkey FOREIGN KEY (escrow_officer_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.reminder_drafts
    ADD CONSTRAINT reminder_drafts_project_deadline_id_fkey FOREIGN KEY (project_deadline_id) REFERENCES public.project_deadlines(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.reminder_drafts
    ADD CONSTRAINT reminder_drafts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reminder_drafts
    ADD CONSTRAINT reminder_drafts_sent_by_user_id_fkey FOREIGN KEY (sent_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.project_folders(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_google_drive_library_root_id_fkey FOREIGN KEY (google_drive_library_root_id) REFERENCES public.google_drive_library_roots(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- Completed on 2026-04-23 14:50:39

--
-- PostgreSQL database dump complete
--
