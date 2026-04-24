-- Generated from DB/schema_live.sql. Regenerate: npm run db:migrate:generate

CREATE SEQUENCE public.clients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;

CREATE SEQUENCE public.conditional_rule_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.conditional_rule_documents_id_seq OWNED BY public.conditional_rule_documents.id;

CREATE SEQUENCE public.conditional_rule_sets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.conditional_rule_sets_id_seq OWNED BY public.conditional_rule_sets.id;

CREATE SEQUENCE public.conditional_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.conditional_rules_id_seq OWNED BY public.conditional_rules.id;

CREATE SEQUENCE public.contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;

CREATE SEQUENCE public.document_set_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.document_set_members_id_seq OWNED BY public.document_set_members.id;

CREATE SEQUENCE public.document_sets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.document_sets_id_seq OWNED BY public.document_sets.id;

CREATE SEQUENCE public.document_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;

CREATE SEQUENCE public.docusign_envelope_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.docusign_envelope_documents_id_seq OWNED BY public.docusign_envelope_documents.id;

CREATE SEQUENCE public.docusign_envelope_recipients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.docusign_envelope_recipients_id_seq OWNED BY public.docusign_envelope_recipients.id;

CREATE SEQUENCE public.docusign_envelopes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.docusign_envelopes_id_seq OWNED BY public.docusign_envelopes.id;

CREATE SEQUENCE public.docusign_template_fields_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.docusign_template_fields_id_seq OWNED BY public.docusign_template_fields.id;

CREATE SEQUENCE public.docusign_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.docusign_templates_id_seq OWNED BY public.docusign_templates.id;

CREATE SEQUENCE public.docusign_webhook_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.docusign_webhook_events_id_seq OWNED BY public.docusign_webhook_events.id;

CREATE SEQUENCE public.google_drive_library_roots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.google_drive_library_roots_id_seq OWNED BY public.google_drive_library_roots.id;

CREATE SEQUENCE public.project_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.project_assignments_id_seq OWNED BY public.project_assignments.id;

CREATE SEQUENCE public.project_deadlines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.project_deadlines_id_seq OWNED BY public.project_deadlines.id;

CREATE SEQUENCE public.project_document_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.project_document_files_id_seq OWNED BY public.project_document_files.id;

CREATE SEQUENCE public.project_document_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.project_document_notes_id_seq OWNED BY public.project_document_notes.id;

CREATE SEQUENCE public.project_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.project_documents_id_seq OWNED BY public.project_documents.id;

CREATE SEQUENCE public.project_folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.project_folders_id_seq OWNED BY public.project_folders.id;

CREATE SEQUENCE public.project_parties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.project_parties_id_seq OWNED BY public.project_parties.id;

CREATE SEQUENCE public.project_tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.project_tasks_id_seq OWNED BY public.project_tasks.id;

CREATE SEQUENCE public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;

CREATE SEQUENCE public.reminder_drafts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.reminder_drafts_id_seq OWNED BY public.reminder_drafts.id;

CREATE SEQUENCE public.stored_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.stored_files_id_seq OWNED BY public.stored_files.id;

CREATE SEQUENCE public.user_invites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.user_invites_id_seq OWNED BY public.user_invites.id;

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
