-- Generated from DB/schema_live.sql. Regenerate: npm run db:migrate:generate

CREATE TYPE public.client_status AS ENUM (
    'active',
    'inactive',
    'prospect'
);



CREATE TYPE public.conditional_property_type AS ENUM (
    'single_family',
    'condo',
    'any'
);



CREATE TYPE public.contact_role AS ENUM (
    'listing_agent',
    'buyers_agent',
    'buyer',
    'seller',
    'escrow_officer',
    'escrow_assistant',
    'lender',
    'other'
);



CREATE TYPE public.deadline_type AS ENUM (
    'deadline',
    'reminder',
    'task'
);



CREATE TYPE public.document_status AS ENUM (
    'pending',
    'needs_buyer_signature',
    'needs_seller_signature',
    'out_for_signature',
    'signed_needs_upload',
    'uploaded_to_brokerage',
    'completed',
    'other'
);



CREATE TYPE public.docusign_envelope_status AS ENUM (
    'created',
    'sent',
    'delivered',
    'completed',
    'declined',
    'voided'
);



CREATE TYPE public.docusign_field_role AS ENUM (
    'seller',
    'buyer',
    'listing_agent',
    'buyers_agent',
    'escrow_officer',
    'other'
);



CREATE TYPE public.docusign_field_type AS ENUM (
    'signature',
    'initial',
    'date',
    'text',
    'checkbox'
);



CREATE TYPE public.docusign_recipient_status AS ENUM (
    'created',
    'sent',
    'delivered',
    'signed',
    'declined'
);



CREATE TYPE public.file_source AS ENUM (
    'manual_upload',
    'docusign_signed_return',
    'google_drive_sync',
    'email_inbound'
);



CREATE TYPE public.file_storage_scope AS ENUM (
    'transaction',
    'template_library'
);



CREATE TYPE public.library_folder_purpose AS ENUM (
    'master_templates'
);



CREATE TYPE public.party_role AS ENUM (
    'buyer',
    'seller',
    'listing_agent',
    'buyers_agent',
    'escrow_officer',
    'escrow_assistant',
    'lender',
    'other'
);



CREATE TYPE public.project_stage AS ENUM (
    'listing_prep',
    'listing_complete',
    'in_escrow',
    'ready_to_close',
    'closed'
);



CREATE TYPE public.reminder_status AS ENUM (
    'draft',
    'sent',
    'dismissed'
);



CREATE TYPE public.rule_kind AS ENUM (
    'standard',
    'conditional'
);



CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress',
    'complete'
);



CREATE TYPE public.transaction_type AS ENUM (
    'listing',
    'buyer_file'
);



CREATE TYPE public.user_role AS ENUM (
    'admin',
    'coordinator'
);



CREATE TYPE public.user_status AS ENUM (
    'active',
    'invited',
    'inactive'
);



SET default_tablespace = '';

SET default_table_access_method = heap;
