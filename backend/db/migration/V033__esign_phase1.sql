CREATE TABLE public.esign_documents (
    id bigserial PRIMARY KEY,
    project_id bigint NOT NULL,
    project_document_id bigint,
    original_file_id bigint NOT NULL,
    render_file_id bigint,
    provider character varying(64),
    provider_document_id character varying(255),
    title character varying(512) NOT NULL,
    status character varying(64) NOT NULL DEFAULT 'draft_uploaded',
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT esign_documents_status_check CHECK (
      status IN ('draft_uploaded', 'editing', 'ready_for_send', 'conversion_failed')
    )
);

CREATE TABLE public.esign_document_fields (
    id bigserial PRIMARY KEY,
    esign_document_id bigint NOT NULL,
    field_type character varying(32) NOT NULL,
    role character varying(64) NOT NULL,
    required boolean DEFAULT true NOT NULL,
    page_number integer NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL,
    width double precision NOT NULL,
    height double precision NOT NULL,
    label character varying(255),
    prefilled_text text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT esign_document_fields_type_check CHECK (
      field_type IN ('signature', 'initials', 'text', 'date', 'checkbox')
    ),
    CONSTRAINT esign_document_fields_role_check CHECK (
      role IN ('vendor', 'client')
    )
);

CREATE TABLE public.esign_document_recipients (
    id bigserial PRIMARY KEY,
    esign_document_id bigint NOT NULL,
    name character varying(255),
    email character varying(512) NOT NULL,
    role character varying(64) NOT NULL,
    routing_order integer DEFAULT 1 NOT NULL,
    status character varying(64) NOT NULL DEFAULT 'draft',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT esign_document_recipients_role_check CHECK (
      role IN ('vendor', 'client')
    )
);

CREATE TABLE public.esign_document_versions (
    id bigserial PRIMARY KEY,
    esign_document_id bigint NOT NULL,
    version_no integer NOT NULL,
    snapshot_json jsonb NOT NULL,
    saved_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.esign_documents
    ADD CONSTRAINT esign_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.esign_documents
    ADD CONSTRAINT esign_documents_project_document_id_fkey FOREIGN KEY (project_document_id) REFERENCES public.project_documents(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.esign_documents
    ADD CONSTRAINT esign_documents_original_file_id_fkey FOREIGN KEY (original_file_id) REFERENCES public.stored_files(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.esign_documents
    ADD CONSTRAINT esign_documents_render_file_id_fkey FOREIGN KEY (render_file_id) REFERENCES public.stored_files(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.esign_documents
    ADD CONSTRAINT esign_documents_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.esign_document_fields
    ADD CONSTRAINT esign_document_fields_esign_document_id_fkey FOREIGN KEY (esign_document_id) REFERENCES public.esign_documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.esign_document_recipients
    ADD CONSTRAINT esign_document_recipients_esign_document_id_fkey FOREIGN KEY (esign_document_id) REFERENCES public.esign_documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.esign_document_versions
    ADD CONSTRAINT esign_document_versions_esign_document_id_fkey FOREIGN KEY (esign_document_id) REFERENCES public.esign_documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.esign_document_versions
    ADD CONSTRAINT esign_document_versions_saved_by_user_id_fkey FOREIGN KEY (saved_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX esign_documents_project_idx ON public.esign_documents(project_id) WHERE deleted_at IS NULL;
CREATE INDEX esign_documents_project_document_idx ON public.esign_documents(project_document_id) WHERE deleted_at IS NULL;
CREATE INDEX esign_fields_document_idx ON public.esign_document_fields(esign_document_id);
CREATE INDEX esign_recipients_document_idx ON public.esign_document_recipients(esign_document_id);
CREATE UNIQUE INDEX esign_versions_document_version_uidx ON public.esign_document_versions(esign_document_id, version_no);
