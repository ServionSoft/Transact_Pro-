-- Generated from DB/schema_live.sql. Regenerate: npm run db:migrate:generate

CREATE TABLE public.clients (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(64),
    company character varying(255),
    agent_role_text character varying(255),
    status public.client_status NOT NULL,
    notes text,
    primary_address character varying(255),
    city character varying(128),
    state character varying(32),
    zip character varying(32),
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);



CREATE TABLE public.conditional_rule_documents (
    id bigint NOT NULL,
    rule_id bigint NOT NULL,
    document_type_id bigint NOT NULL,
    required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.conditional_rule_sets (
    id bigint NOT NULL,
    rule_id bigint NOT NULL,
    document_set_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.conditional_rules (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    kind public.rule_kind NOT NULL,
    triggers_json jsonb,
    transaction_type public.transaction_type,
    property_type public.conditional_property_type,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.contacts (
    id bigint NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(64),
    company character varying(255),
    role public.contact_role NOT NULL,
    notes text,
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);



CREATE TABLE public.document_set_members (
    id bigint NOT NULL,
    document_set_id bigint NOT NULL,
    document_type_id bigint NOT NULL,
    required boolean DEFAULT true NOT NULL,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.document_sets (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sort_order integer,
    is_active boolean DEFAULT true NOT NULL,
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);



CREATE TABLE public.document_types (
    id bigint NOT NULL,
    code character varying(64) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    is_standard_car_form boolean DEFAULT false NOT NULL,
    form_number character varying(64),
    form_version character varying(32),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.docusign_envelope_documents (
    id bigint NOT NULL,
    envelope_id bigint NOT NULL,
    project_document_id bigint NOT NULL,
    template_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.docusign_envelope_recipients (
    id bigint NOT NULL,
    envelope_id bigint NOT NULL,
    contact_id bigint,
    email character varying(512) NOT NULL,
    name character varying(255),
    role public.docusign_field_role NOT NULL,
    routing_order integer DEFAULT 1 NOT NULL,
    status public.docusign_recipient_status DEFAULT 'created'::public.docusign_recipient_status NOT NULL,
    signed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.docusign_envelopes (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    docusign_envelope_id character varying(255),
    status public.docusign_envelope_status DEFAULT 'created'::public.docusign_envelope_status NOT NULL,
    sent_by_user_id bigint,
    sent_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.docusign_template_fields (
    id bigint NOT NULL,
    template_id bigint NOT NULL,
    role public.docusign_field_role NOT NULL,
    field_type public.docusign_field_type NOT NULL,
    page_number integer NOT NULL,
    x_anchor double precision,
    y_anchor double precision,
    width double precision,
    height double precision,
    anchor_string character varying(255),
    is_required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.docusign_templates (
    id bigint NOT NULL,
    document_type_id bigint NOT NULL,
    docusign_template_id character varying(255),
    pdf_reference_file_id bigint,
    version integer DEFAULT 1 NOT NULL,
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.docusign_webhook_events (
    id bigint NOT NULL,
    envelope_id bigint NOT NULL,
    event_type character varying(128) NOT NULL,
    raw_payload jsonb NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.google_drive_library_roots (
    id bigint NOT NULL,
    purpose public.library_folder_purpose NOT NULL,
    label character varying(255),
    drive_folder_id character varying(255) NOT NULL,
    drive_account_user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.project_assignments (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    user_id bigint NOT NULL,
    assigned_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.project_deadlines (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    title character varying(512) NOT NULL,
    due_date date NOT NULL,
    type public.deadline_type NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.project_document_files (
    id bigint NOT NULL,
    project_document_id bigint NOT NULL,
    stored_file_id bigint NOT NULL,
    sort_order integer,
    label character varying(255),
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    docusign_envelope_document_id bigint
);



CREATE TABLE public.project_document_notes (
    id bigint NOT NULL,
    project_document_id bigint NOT NULL,
    author_user_id bigint,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.project_documents (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    document_type_id bigint,
    source_document_set_id bigint,
    display_name character varying(512) NOT NULL,
    status public.document_status NOT NULL,
    custom_status_text character varying(255),
    required boolean DEFAULT false NOT NULL,
    current_file_id bigint,
    created_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);



CREATE TABLE public.project_folders (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    parent_folder_id bigint,
    name character varying(255) NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.project_parties (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    contact_id bigint NOT NULL,
    party_role public.party_role NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.project_tasks (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    title character varying(512) NOT NULL,
    stage public.project_stage NOT NULL,
    status public.task_status NOT NULL,
    due_date date,
    completed_at timestamp with time zone,
    assigned_to_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.projects (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    client_id bigint NOT NULL,
    transaction_type public.transaction_type NOT NULL,
    stage public.project_stage NOT NULL,
    property_address character varying(512) NOT NULL,
    city character varying(128),
    state character varying(32),
    zip character varying(32),
    year_built character varying(16),
    property_type character varying(128),
    representation_side character varying(128),
    list_price numeric(14,2),
    escrow_officer_contact_id bigint,
    escrow_company character varying(255),
    next_step_text character varying(512),
    next_step_date date,
    created_by_user_id bigint,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);



CREATE TABLE public.reminder_drafts (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    project_deadline_id bigint,
    reminder_type character varying(255) NOT NULL,
    subject character varying(512) NOT NULL,
    body text NOT NULL,
    to_address character varying(512) NOT NULL,
    status public.reminder_status NOT NULL,
    sent_by_user_id bigint,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.stored_files (
    id bigint NOT NULL,
    storage_scope public.file_storage_scope NOT NULL,
    project_id bigint,
    folder_id bigint,
    google_drive_library_root_id bigint,
    name character varying(512) NOT NULL,
    storage_key character varying(1024) NOT NULL,
    size_bytes bigint NOT NULL,
    mime_type character varying(255) NOT NULL,
    uploaded_by_user_id bigint,
    source public.file_source NOT NULL,
    drive_file_id character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT stored_files_scope_project_chk CHECK ((((storage_scope = 'transaction'::public.file_storage_scope) AND (project_id IS NOT NULL)) OR ((storage_scope = 'template_library'::public.file_storage_scope) AND (project_id IS NULL))))
);



CREATE TABLE public.user_invites (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    invited_by_user_id bigint,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    status public.user_status NOT NULL,
    last_active_at timestamp with time zone,
    joined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


