-- Generated from DB/schema_live.sql. Regenerate: npm run db:migrate:generate

CREATE INDEX idx_docusign_envelope_documents_envelope ON public.docusign_envelope_documents USING btree (envelope_id);

CREATE INDEX idx_docusign_envelopes_project ON public.docusign_envelopes USING btree (project_id);

CREATE INDEX idx_docusign_template_fields_template ON public.docusign_template_fields USING btree (template_id);

CREATE INDEX idx_docusign_webhook_events_envelope ON public.docusign_webhook_events USING btree (envelope_id);

CREATE INDEX idx_project_document_files_document ON public.project_document_files USING btree (project_document_id);

CREATE INDEX idx_project_document_files_file ON public.project_document_files USING btree (stored_file_id);

CREATE INDEX idx_stored_files_folder_active ON public.stored_files USING btree (folder_id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_stored_files_library_active ON public.stored_files USING btree (storage_scope) WHERE ((deleted_at IS NULL) AND (storage_scope = 'template_library'::public.file_storage_scope));

CREATE INDEX idx_stored_files_project_active ON public.stored_files USING btree (project_id) WHERE ((deleted_at IS NULL) AND (storage_scope = 'transaction'::public.file_storage_scope));

CREATE UNIQUE INDEX uq_project_document_files_one_primary ON public.project_document_files USING btree (project_document_id) WHERE is_primary;
