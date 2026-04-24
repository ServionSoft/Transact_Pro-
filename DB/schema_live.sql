--
-- PostgreSQL database dump
--

\restrict OM6WgHAxTgCQc8S89F7F9tIN5xpYPZezTxBUffSrnfPWhujHeEoMN6mPg98QFRT

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-23 14:50:38

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 5440 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 955 (class 1247 OID 24648)
-- Name: client_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.client_status AS ENUM (
    'active',
    'inactive',
    'prospect'
);


ALTER TYPE public.client_status OWNER TO postgres;

--
-- TOC entry 982 (class 1247 OID 24736)
-- Name: conditional_property_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.conditional_property_type AS ENUM (
    'single_family',
    'condo',
    'any'
);


ALTER TYPE public.conditional_property_type OWNER TO postgres;

--
-- TOC entry 952 (class 1247 OID 24630)
-- Name: contact_role; Type: TYPE; Schema: public; Owner: postgres
--

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


ALTER TYPE public.contact_role OWNER TO postgres;

--
-- TOC entry 988 (class 1247 OID 24752)
-- Name: deadline_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.deadline_type AS ENUM (
    'deadline',
    'reminder',
    'task'
);


ALTER TYPE public.deadline_type OWNER TO postgres;

--
-- TOC entry 967 (class 1247 OID 24692)
-- Name: document_status; Type: TYPE; Schema: public; Owner: postgres
--

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


ALTER TYPE public.document_status OWNER TO postgres;

--
-- TOC entry 1066 (class 1247 OID 25410)
-- Name: docusign_envelope_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.docusign_envelope_status AS ENUM (
    'created',
    'sent',
    'delivered',
    'completed',
    'declined',
    'voided'
);


ALTER TYPE public.docusign_envelope_status OWNER TO postgres;

--
-- TOC entry 1060 (class 1247 OID 25385)
-- Name: docusign_field_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.docusign_field_role AS ENUM (
    'seller',
    'buyer',
    'listing_agent',
    'buyers_agent',
    'escrow_officer',
    'other'
);


ALTER TYPE public.docusign_field_role OWNER TO postgres;

--
-- TOC entry 1063 (class 1247 OID 25398)
-- Name: docusign_field_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.docusign_field_type AS ENUM (
    'signature',
    'initial',
    'date',
    'text',
    'checkbox'
);


ALTER TYPE public.docusign_field_type OWNER TO postgres;

--
-- TOC entry 1069 (class 1247 OID 25424)
-- Name: docusign_recipient_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.docusign_recipient_status AS ENUM (
    'created',
    'sent',
    'delivered',
    'signed',
    'declined'
);


ALTER TYPE public.docusign_recipient_status OWNER TO postgres;

--
-- TOC entry 973 (class 1247 OID 24716)
-- Name: file_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.file_source AS ENUM (
    'manual_upload',
    'docusign_signed_return',
    'google_drive_sync',
    'email_inbound'
);


ALTER TYPE public.file_source OWNER TO postgres;

--
-- TOC entry 970 (class 1247 OID 24710)
-- Name: file_storage_scope; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.file_storage_scope AS ENUM (
    'transaction',
    'template_library'
);


ALTER TYPE public.file_storage_scope OWNER TO postgres;

--
-- TOC entry 979 (class 1247 OID 24732)
-- Name: library_folder_purpose; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.library_folder_purpose AS ENUM (
    'master_templates'
);


ALTER TYPE public.library_folder_purpose OWNER TO postgres;

--
-- TOC entry 964 (class 1247 OID 24674)
-- Name: party_role; Type: TYPE; Schema: public; Owner: postgres
--

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


ALTER TYPE public.party_role OWNER TO postgres;

--
-- TOC entry 961 (class 1247 OID 24662)
-- Name: project_stage; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.project_stage AS ENUM (
    'listing_prep',
    'listing_complete',
    'in_escrow',
    'ready_to_close',
    'closed'
);


ALTER TYPE public.project_stage OWNER TO postgres;

--
-- TOC entry 991 (class 1247 OID 24760)
-- Name: reminder_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reminder_status AS ENUM (
    'draft',
    'sent',
    'dismissed'
);


ALTER TYPE public.reminder_status OWNER TO postgres;

--
-- TOC entry 976 (class 1247 OID 24726)
-- Name: rule_kind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rule_kind AS ENUM (
    'standard',
    'conditional'
);


ALTER TYPE public.rule_kind OWNER TO postgres;

--
-- TOC entry 985 (class 1247 OID 24744)
-- Name: task_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress',
    'complete'
);


ALTER TYPE public.task_status OWNER TO postgres;

--
-- TOC entry 958 (class 1247 OID 24656)
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.transaction_type AS ENUM (
    'listing',
    'buyer_file'
);


ALTER TYPE public.transaction_type OWNER TO postgres;

--
-- TOC entry 946 (class 1247 OID 24616)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'coordinator'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 949 (class 1247 OID 24622)
-- Name: user_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'invited',
    'inactive'
);


ALTER TYPE public.user_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 226 (class 1259 OID 24811)
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.clients OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 24810)
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- TOC entry 5441 (class 0 OID 0)
-- Dependencies: 225
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- TOC entry 246 (class 1259 OID 25077)
-- Name: conditional_rule_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conditional_rule_documents (
    id bigint NOT NULL,
    rule_id bigint NOT NULL,
    document_type_id bigint NOT NULL,
    required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conditional_rule_documents OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 25076)
-- Name: conditional_rule_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conditional_rule_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conditional_rule_documents_id_seq OWNER TO postgres;

--
-- TOC entry 5442 (class 0 OID 0)
-- Dependencies: 245
-- Name: conditional_rule_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conditional_rule_documents_id_seq OWNED BY public.conditional_rule_documents.id;


--
-- TOC entry 244 (class 1259 OID 25051)
-- Name: conditional_rule_sets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conditional_rule_sets (
    id bigint NOT NULL,
    rule_id bigint NOT NULL,
    document_set_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conditional_rule_sets OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 25050)
-- Name: conditional_rule_sets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conditional_rule_sets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conditional_rule_sets_id_seq OWNER TO postgres;

--
-- TOC entry 5443 (class 0 OID 0)
-- Dependencies: 243
-- Name: conditional_rule_sets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conditional_rule_sets_id_seq OWNED BY public.conditional_rule_sets.id;


--
-- TOC entry 242 (class 1259 OID 25028)
-- Name: conditional_rules; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.conditional_rules OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 25027)
-- Name: conditional_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conditional_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conditional_rules_id_seq OWNER TO postgres;

--
-- TOC entry 5444 (class 0 OID 0)
-- Dependencies: 241
-- Name: conditional_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conditional_rules_id_seq OWNED BY public.conditional_rules.id;


--
-- TOC entry 228 (class 1259 OID 24832)
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.contacts OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 24831)
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO postgres;

--
-- TOC entry 5445 (class 0 OID 0)
-- Dependencies: 227
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 240 (class 1259 OID 25000)
-- Name: document_set_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_set_members (
    id bigint NOT NULL,
    document_set_id bigint NOT NULL,
    document_type_id bigint NOT NULL,
    required boolean DEFAULT true NOT NULL,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_set_members OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 24999)
-- Name: document_set_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_set_members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_set_members_id_seq OWNER TO postgres;

--
-- TOC entry 5446 (class 0 OID 0)
-- Dependencies: 239
-- Name: document_set_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_set_members_id_seq OWNED BY public.document_set_members.id;


--
-- TOC entry 238 (class 1259 OID 24978)
-- Name: document_sets; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.document_sets OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 24977)
-- Name: document_sets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_sets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_sets_id_seq OWNER TO postgres;

--
-- TOC entry 5447 (class 0 OID 0)
-- Dependencies: 237
-- Name: document_sets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_sets_id_seq OWNED BY public.document_sets.id;


--
-- TOC entry 224 (class 1259 OID 24789)
-- Name: document_types; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.document_types OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 24788)
-- Name: document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_types_id_seq OWNER TO postgres;

--
-- TOC entry 5448 (class 0 OID 0)
-- Dependencies: 223
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;


--
-- TOC entry 272 (class 1259 OID 25516)
-- Name: docusign_envelope_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.docusign_envelope_documents (
    id bigint NOT NULL,
    envelope_id bigint NOT NULL,
    project_document_id bigint NOT NULL,
    template_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.docusign_envelope_documents OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 25515)
-- Name: docusign_envelope_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.docusign_envelope_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.docusign_envelope_documents_id_seq OWNER TO postgres;

--
-- TOC entry 5449 (class 0 OID 0)
-- Dependencies: 271
-- Name: docusign_envelope_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.docusign_envelope_documents_id_seq OWNED BY public.docusign_envelope_documents.id;


--
-- TOC entry 274 (class 1259 OID 25547)
-- Name: docusign_envelope_recipients; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.docusign_envelope_recipients OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 25546)
-- Name: docusign_envelope_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.docusign_envelope_recipients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.docusign_envelope_recipients_id_seq OWNER TO postgres;

--
-- TOC entry 5450 (class 0 OID 0)
-- Dependencies: 273
-- Name: docusign_envelope_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.docusign_envelope_recipients_id_seq OWNED BY public.docusign_envelope_recipients.id;


--
-- TOC entry 270 (class 1259 OID 25491)
-- Name: docusign_envelopes; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.docusign_envelopes OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 25490)
-- Name: docusign_envelopes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.docusign_envelopes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.docusign_envelopes_id_seq OWNER TO postgres;

--
-- TOC entry 5451 (class 0 OID 0)
-- Dependencies: 269
-- Name: docusign_envelopes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.docusign_envelopes_id_seq OWNED BY public.docusign_envelopes.id;


--
-- TOC entry 268 (class 1259 OID 25468)
-- Name: docusign_template_fields; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.docusign_template_fields OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 25467)
-- Name: docusign_template_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.docusign_template_fields_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.docusign_template_fields_id_seq OWNER TO postgres;

--
-- TOC entry 5452 (class 0 OID 0)
-- Dependencies: 267
-- Name: docusign_template_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.docusign_template_fields_id_seq OWNED BY public.docusign_template_fields.id;


--
-- TOC entry 266 (class 1259 OID 25436)
-- Name: docusign_templates; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.docusign_templates OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 25435)
-- Name: docusign_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.docusign_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.docusign_templates_id_seq OWNER TO postgres;

--
-- TOC entry 5453 (class 0 OID 0)
-- Dependencies: 265
-- Name: docusign_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.docusign_templates_id_seq OWNED BY public.docusign_templates.id;


--
-- TOC entry 276 (class 1259 OID 25578)
-- Name: docusign_webhook_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.docusign_webhook_events (
    id bigint NOT NULL,
    envelope_id bigint NOT NULL,
    event_type character varying(128) NOT NULL,
    raw_payload jsonb NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.docusign_webhook_events OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 25577)
-- Name: docusign_webhook_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.docusign_webhook_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.docusign_webhook_events_id_seq OWNER TO postgres;

--
-- TOC entry 5454 (class 0 OID 0)
-- Dependencies: 275
-- Name: docusign_webhook_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.docusign_webhook_events_id_seq OWNED BY public.docusign_webhook_events.id;


--
-- TOC entry 234 (class 1259 OID 24915)
-- Name: google_drive_library_roots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.google_drive_library_roots (
    id bigint NOT NULL,
    purpose public.library_folder_purpose NOT NULL,
    label character varying(255),
    drive_folder_id character varying(255) NOT NULL,
    drive_account_user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.google_drive_library_roots OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 24914)
-- Name: google_drive_library_roots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.google_drive_library_roots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.google_drive_library_roots_id_seq OWNER TO postgres;

--
-- TOC entry 5455 (class 0 OID 0)
-- Dependencies: 233
-- Name: google_drive_library_roots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.google_drive_library_roots_id_seq OWNED BY public.google_drive_library_roots.id;


--
-- TOC entry 260 (class 1259 OID 25293)
-- Name: project_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_assignments (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    user_id bigint NOT NULL,
    assigned_by_user_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_assignments OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 25292)
-- Name: project_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_assignments_id_seq OWNER TO postgres;

--
-- TOC entry 5456 (class 0 OID 0)
-- Dependencies: 259
-- Name: project_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_assignments_id_seq OWNED BY public.project_assignments.id;


--
-- TOC entry 254 (class 1259 OID 25204)
-- Name: project_deadlines; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.project_deadlines OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 25203)
-- Name: project_deadlines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_deadlines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_deadlines_id_seq OWNER TO postgres;

--
-- TOC entry 5457 (class 0 OID 0)
-- Dependencies: 253
-- Name: project_deadlines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_deadlines_id_seq OWNED BY public.project_deadlines.id;


--
-- TOC entry 264 (class 1259 OID 25349)
-- Name: project_document_files; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.project_document_files OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 25348)
-- Name: project_document_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_document_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_document_files_id_seq OWNER TO postgres;

--
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 263
-- Name: project_document_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_document_files_id_seq OWNED BY public.project_document_files.id;


--
-- TOC entry 250 (class 1259 OID 25149)
-- Name: project_document_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_document_notes (
    id bigint NOT NULL,
    project_document_id bigint NOT NULL,
    author_user_id bigint,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_document_notes OWNER TO postgres;

--
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 250
-- Name: COLUMN project_document_notes.author_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_document_notes.author_user_id IS 'Nullable after user deletion; body still kept for audit.';


--
-- TOC entry 249 (class 1259 OID 25148)
-- Name: project_document_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_document_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_document_notes_id_seq OWNER TO postgres;

--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 249
-- Name: project_document_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_document_notes_id_seq OWNED BY public.project_document_notes.id;


--
-- TOC entry 248 (class 1259 OID 25105)
-- Name: project_documents; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.project_documents OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 25104)
-- Name: project_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_documents_id_seq OWNER TO postgres;

--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 247
-- Name: project_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_documents_id_seq OWNED BY public.project_documents.id;


--
-- TOC entry 232 (class 1259 OID 24887)
-- Name: project_folders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_folders (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    parent_folder_id bigint,
    name character varying(255) NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_folders OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 24886)
-- Name: project_folders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_folders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_folders_id_seq OWNER TO postgres;

--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 231
-- Name: project_folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_folders_id_seq OWNED BY public.project_folders.id;


--
-- TOC entry 258 (class 1259 OID 25264)
-- Name: project_parties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_parties (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    contact_id bigint NOT NULL,
    party_role public.party_role NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_parties OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 25263)
-- Name: project_parties_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_parties_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_parties_id_seq OWNER TO postgres;

--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 257
-- Name: project_parties_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_parties_id_seq OWNED BY public.project_parties.id;


--
-- TOC entry 252 (class 1259 OID 25176)
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.project_tasks OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 25175)
-- Name: project_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_tasks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_tasks_id_seq OWNER TO postgres;

--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 251
-- Name: project_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_tasks_id_seq OWNED BY public.project_tasks.id;


--
-- TOC entry 230 (class 1259 OID 24853)
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.projects OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 24852)
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO postgres;

--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 229
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- TOC entry 256 (class 1259 OID 25229)
-- Name: reminder_drafts; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.reminder_drafts OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 25228)
-- Name: reminder_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reminder_drafts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reminder_drafts_id_seq OWNER TO postgres;

--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 255
-- Name: reminder_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reminder_drafts_id_seq OWNED BY public.reminder_drafts.id;


--
-- TOC entry 236 (class 1259 OID 24937)
-- Name: stored_files; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.stored_files OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 24936)
-- Name: stored_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stored_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stored_files_id_seq OWNER TO postgres;

--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 235
-- Name: stored_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stored_files_id_seq OWNED BY public.stored_files.id;


--
-- TOC entry 262 (class 1259 OID 25324)
-- Name: user_invites; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.user_invites OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 25323)
-- Name: user_invites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_invites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_invites_id_seq OWNER TO postgres;

--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 261
-- Name: user_invites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_invites_id_seq OWNED BY public.user_invites.id;


--
-- TOC entry 222 (class 1259 OID 24768)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

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


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 24767)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 221
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 5051 (class 2604 OID 24814)
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- TOC entry 5085 (class 2604 OID 25080)
-- Name: conditional_rule_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_documents ALTER COLUMN id SET DEFAULT nextval('public.conditional_rule_documents_id_seq'::regclass);


--
-- TOC entry 5082 (class 2604 OID 25054)
-- Name: conditional_rule_sets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_sets ALTER COLUMN id SET DEFAULT nextval('public.conditional_rule_sets_id_seq'::regclass);


--
-- TOC entry 5078 (class 2604 OID 25031)
-- Name: conditional_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rules ALTER COLUMN id SET DEFAULT nextval('public.conditional_rules_id_seq'::regclass);


--
-- TOC entry 5054 (class 2604 OID 24835)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 5074 (class 2604 OID 25003)
-- Name: document_set_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_set_members ALTER COLUMN id SET DEFAULT nextval('public.document_set_members_id_seq'::regclass);


--
-- TOC entry 5070 (class 2604 OID 24981)
-- Name: document_sets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_sets ALTER COLUMN id SET DEFAULT nextval('public.document_sets_id_seq'::regclass);


--
-- TOC entry 5046 (class 2604 OID 24792)
-- Name: document_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- TOC entry 5132 (class 2604 OID 25519)
-- Name: docusign_envelope_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_documents ALTER COLUMN id SET DEFAULT nextval('public.docusign_envelope_documents_id_seq'::regclass);


--
-- TOC entry 5135 (class 2604 OID 25550)
-- Name: docusign_envelope_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_recipients ALTER COLUMN id SET DEFAULT nextval('public.docusign_envelope_recipients_id_seq'::regclass);


--
-- TOC entry 5128 (class 2604 OID 25494)
-- Name: docusign_envelopes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelopes ALTER COLUMN id SET DEFAULT nextval('public.docusign_envelopes_id_seq'::regclass);


--
-- TOC entry 5124 (class 2604 OID 25471)
-- Name: docusign_template_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_template_fields ALTER COLUMN id SET DEFAULT nextval('public.docusign_template_fields_id_seq'::regclass);


--
-- TOC entry 5120 (class 2604 OID 25439)
-- Name: docusign_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_templates ALTER COLUMN id SET DEFAULT nextval('public.docusign_templates_id_seq'::regclass);


--
-- TOC entry 5140 (class 2604 OID 25581)
-- Name: docusign_webhook_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_webhook_events ALTER COLUMN id SET DEFAULT nextval('public.docusign_webhook_events_id_seq'::regclass);


--
-- TOC entry 5064 (class 2604 OID 24918)
-- Name: google_drive_library_roots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_drive_library_roots ALTER COLUMN id SET DEFAULT nextval('public.google_drive_library_roots_id_seq'::regclass);


--
-- TOC entry 5110 (class 2604 OID 25296)
-- Name: project_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments ALTER COLUMN id SET DEFAULT nextval('public.project_assignments_id_seq'::regclass);


--
-- TOC entry 5099 (class 2604 OID 25207)
-- Name: project_deadlines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_deadlines ALTER COLUMN id SET DEFAULT nextval('public.project_deadlines_id_seq'::regclass);


--
-- TOC entry 5116 (class 2604 OID 25352)
-- Name: project_document_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_files ALTER COLUMN id SET DEFAULT nextval('public.project_document_files_id_seq'::regclass);


--
-- TOC entry 5093 (class 2604 OID 25152)
-- Name: project_document_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_notes ALTER COLUMN id SET DEFAULT nextval('public.project_document_notes_id_seq'::regclass);


--
-- TOC entry 5089 (class 2604 OID 25108)
-- Name: project_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents ALTER COLUMN id SET DEFAULT nextval('public.project_documents_id_seq'::regclass);


--
-- TOC entry 5060 (class 2604 OID 24890)
-- Name: project_folders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_folders ALTER COLUMN id SET DEFAULT nextval('public.project_folders_id_seq'::regclass);


--
-- TOC entry 5106 (class 2604 OID 25267)
-- Name: project_parties id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_parties ALTER COLUMN id SET DEFAULT nextval('public.project_parties_id_seq'::regclass);


--
-- TOC entry 5096 (class 2604 OID 25179)
-- Name: project_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks ALTER COLUMN id SET DEFAULT nextval('public.project_tasks_id_seq'::regclass);


--
-- TOC entry 5057 (class 2604 OID 24856)
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- TOC entry 5103 (class 2604 OID 25232)
-- Name: reminder_drafts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_drafts ALTER COLUMN id SET DEFAULT nextval('public.reminder_drafts_id_seq'::regclass);


--
-- TOC entry 5067 (class 2604 OID 24940)
-- Name: stored_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files ALTER COLUMN id SET DEFAULT nextval('public.stored_files_id_seq'::regclass);


--
-- TOC entry 5113 (class 2604 OID 25327)
-- Name: user_invites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_invites ALTER COLUMN id SET DEFAULT nextval('public.user_invites_id_seq'::regclass);


--
-- TOC entry 5043 (class 2604 OID 24771)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5153 (class 2606 OID 24825)
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- TOC entry 5182 (class 2606 OID 25091)
-- Name: conditional_rule_documents conditional_rule_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_documents
    ADD CONSTRAINT conditional_rule_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5184 (class 2606 OID 25093)
-- Name: conditional_rule_documents conditional_rule_documents_rule_id_document_type_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_documents
    ADD CONSTRAINT conditional_rule_documents_rule_id_document_type_id_key UNIQUE (rule_id, document_type_id);


--
-- TOC entry 5178 (class 2606 OID 25063)
-- Name: conditional_rule_sets conditional_rule_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_sets
    ADD CONSTRAINT conditional_rule_sets_pkey PRIMARY KEY (id);


--
-- TOC entry 5180 (class 2606 OID 25065)
-- Name: conditional_rule_sets conditional_rule_sets_rule_id_document_set_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_sets
    ADD CONSTRAINT conditional_rule_sets_rule_id_document_set_id_key UNIQUE (rule_id, document_set_id);


--
-- TOC entry 5176 (class 2606 OID 25044)
-- Name: conditional_rules conditional_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rules
    ADD CONSTRAINT conditional_rules_pkey PRIMARY KEY (id);


--
-- TOC entry 5155 (class 2606 OID 24846)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 5172 (class 2606 OID 25016)
-- Name: document_set_members document_set_members_document_set_id_document_type_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_set_members
    ADD CONSTRAINT document_set_members_document_set_id_document_type_id_key UNIQUE (document_set_id, document_type_id);


--
-- TOC entry 5174 (class 2606 OID 25014)
-- Name: document_set_members document_set_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_set_members
    ADD CONSTRAINT document_set_members_pkey PRIMARY KEY (id);


--
-- TOC entry 5170 (class 2606 OID 24993)
-- Name: document_sets document_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_sets
    ADD CONSTRAINT document_sets_pkey PRIMARY KEY (id);


--
-- TOC entry 5149 (class 2606 OID 24809)
-- Name: document_types document_types_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_code_key UNIQUE (code);


--
-- TOC entry 5151 (class 2606 OID 24807)
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- TOC entry 5225 (class 2606 OID 25530)
-- Name: docusign_envelope_documents docusign_envelope_documents_envelope_id_project_document_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_envelope_id_project_document_id_key UNIQUE (envelope_id, project_document_id);


--
-- TOC entry 5227 (class 2606 OID 25528)
-- Name: docusign_envelope_documents docusign_envelope_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5230 (class 2606 OID 25566)
-- Name: docusign_envelope_recipients docusign_envelope_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_recipients
    ADD CONSTRAINT docusign_envelope_recipients_pkey PRIMARY KEY (id);


--
-- TOC entry 5222 (class 2606 OID 25504)
-- Name: docusign_envelopes docusign_envelopes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelopes
    ADD CONSTRAINT docusign_envelopes_pkey PRIMARY KEY (id);


--
-- TOC entry 5219 (class 2606 OID 25484)
-- Name: docusign_template_fields docusign_template_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_template_fields
    ADD CONSTRAINT docusign_template_fields_pkey PRIMARY KEY (id);


--
-- TOC entry 5215 (class 2606 OID 25451)
-- Name: docusign_templates docusign_templates_document_type_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_document_type_id_key UNIQUE (document_type_id);


--
-- TOC entry 5217 (class 2606 OID 25449)
-- Name: docusign_templates docusign_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5232 (class 2606 OID 25593)
-- Name: docusign_webhook_events docusign_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_webhook_events
    ADD CONSTRAINT docusign_webhook_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5163 (class 2606 OID 24930)
-- Name: google_drive_library_roots google_drive_library_roots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_drive_library_roots
    ADD CONSTRAINT google_drive_library_roots_pkey PRIMARY KEY (id);


--
-- TOC entry 5200 (class 2606 OID 25305)
-- Name: project_assignments project_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5202 (class 2606 OID 25307)
-- Name: project_assignments project_assignments_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- TOC entry 5192 (class 2606 OID 25222)
-- Name: project_deadlines project_deadlines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_deadlines
    ADD CONSTRAINT project_deadlines_pkey PRIMARY KEY (id);


--
-- TOC entry 5210 (class 2606 OID 25363)
-- Name: project_document_files project_document_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_pkey PRIMARY KEY (id);


--
-- TOC entry 5212 (class 2606 OID 25365)
-- Name: project_document_files project_document_files_unique_file; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_unique_file UNIQUE (project_document_id, stored_file_id);


--
-- TOC entry 5188 (class 2606 OID 25164)
-- Name: project_document_notes project_document_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_notes
    ADD CONSTRAINT project_document_notes_pkey PRIMARY KEY (id);


--
-- TOC entry 5186 (class 2606 OID 25122)
-- Name: project_documents project_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5159 (class 2606 OID 24901)
-- Name: project_folders project_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_folders
    ADD CONSTRAINT project_folders_pkey PRIMARY KEY (id);


--
-- TOC entry 5161 (class 2606 OID 24903)
-- Name: project_folders project_folders_project_id_parent_folder_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_folders
    ADD CONSTRAINT project_folders_project_id_parent_folder_id_name_key UNIQUE (project_id, parent_folder_id, name);


--
-- TOC entry 5196 (class 2606 OID 25279)
-- Name: project_parties project_parties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_parties
    ADD CONSTRAINT project_parties_pkey PRIMARY KEY (id);


--
-- TOC entry 5198 (class 2606 OID 25281)
-- Name: project_parties project_parties_project_id_contact_id_party_role_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_parties
    ADD CONSTRAINT project_parties_project_id_contact_id_party_role_key UNIQUE (project_id, contact_id, party_role);


--
-- TOC entry 5190 (class 2606 OID 25192)
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 5157 (class 2606 OID 24870)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 5194 (class 2606 OID 25247)
-- Name: reminder_drafts reminder_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_drafts
    ADD CONSTRAINT reminder_drafts_pkey PRIMARY KEY (id);


--
-- TOC entry 5168 (class 2606 OID 24956)
-- Name: stored_files stored_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_pkey PRIMARY KEY (id);


--
-- TOC entry 5204 (class 2606 OID 25339)
-- Name: user_invites user_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_pkey PRIMARY KEY (id);


--
-- TOC entry 5206 (class 2606 OID 25341)
-- Name: user_invites user_invites_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_token_key UNIQUE (token);


--
-- TOC entry 5145 (class 2606 OID 24787)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5147 (class 2606 OID 24785)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5228 (class 1259 OID 25606)
-- Name: idx_docusign_envelope_documents_envelope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docusign_envelope_documents_envelope ON public.docusign_envelope_documents USING btree (envelope_id);


--
-- TOC entry 5223 (class 1259 OID 25605)
-- Name: idx_docusign_envelopes_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docusign_envelopes_project ON public.docusign_envelopes USING btree (project_id);


--
-- TOC entry 5220 (class 1259 OID 25604)
-- Name: idx_docusign_template_fields_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docusign_template_fields_template ON public.docusign_template_fields USING btree (template_id);


--
-- TOC entry 5233 (class 1259 OID 25607)
-- Name: idx_docusign_webhook_events_envelope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_docusign_webhook_events_envelope ON public.docusign_webhook_events USING btree (envelope_id);


--
-- TOC entry 5207 (class 1259 OID 25376)
-- Name: idx_project_document_files_document; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_document_files_document ON public.project_document_files USING btree (project_document_id);


--
-- TOC entry 5208 (class 1259 OID 25377)
-- Name: idx_project_document_files_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_document_files_file ON public.project_document_files USING btree (stored_file_id);


--
-- TOC entry 5164 (class 1259 OID 25609)
-- Name: idx_stored_files_folder_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stored_files_folder_active ON public.stored_files USING btree (folder_id) WHERE (deleted_at IS NULL);


--
-- TOC entry 5165 (class 1259 OID 25610)
-- Name: idx_stored_files_library_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stored_files_library_active ON public.stored_files USING btree (storage_scope) WHERE ((deleted_at IS NULL) AND (storage_scope = 'template_library'::public.file_storage_scope));


--
-- TOC entry 5166 (class 1259 OID 25608)
-- Name: idx_stored_files_project_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stored_files_project_active ON public.stored_files USING btree (project_id) WHERE ((deleted_at IS NULL) AND (storage_scope = 'transaction'::public.file_storage_scope));


--
-- TOC entry 5213 (class 1259 OID 25378)
-- Name: uq_project_document_files_one_primary; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_project_document_files_one_primary ON public.project_document_files USING btree (project_document_id) WHERE is_primary;


--
-- TOC entry 5234 (class 2606 OID 24826)
-- Name: clients clients_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5252 (class 2606 OID 25099)
-- Name: conditional_rule_documents conditional_rule_documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_documents
    ADD CONSTRAINT conditional_rule_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE RESTRICT;


--
-- TOC entry 5253 (class 2606 OID 25094)
-- Name: conditional_rule_documents conditional_rule_documents_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_documents
    ADD CONSTRAINT conditional_rule_documents_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.conditional_rules(id) ON DELETE CASCADE;


--
-- TOC entry 5250 (class 2606 OID 25071)
-- Name: conditional_rule_sets conditional_rule_sets_document_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_sets
    ADD CONSTRAINT conditional_rule_sets_document_set_id_fkey FOREIGN KEY (document_set_id) REFERENCES public.document_sets(id) ON DELETE CASCADE;


--
-- TOC entry 5251 (class 2606 OID 25066)
-- Name: conditional_rule_sets conditional_rule_sets_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rule_sets
    ADD CONSTRAINT conditional_rule_sets_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.conditional_rules(id) ON DELETE CASCADE;


--
-- TOC entry 5249 (class 2606 OID 25045)
-- Name: conditional_rules conditional_rules_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_rules
    ADD CONSTRAINT conditional_rules_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5235 (class 2606 OID 24847)
-- Name: contacts contacts_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5247 (class 2606 OID 25017)
-- Name: document_set_members document_set_members_document_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_set_members
    ADD CONSTRAINT document_set_members_document_set_id_fkey FOREIGN KEY (document_set_id) REFERENCES public.document_sets(id) ON DELETE CASCADE;


--
-- TOC entry 5248 (class 2606 OID 25022)
-- Name: document_set_members document_set_members_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_set_members
    ADD CONSTRAINT document_set_members_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE RESTRICT;


--
-- TOC entry 5246 (class 2606 OID 24994)
-- Name: document_sets document_sets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_sets
    ADD CONSTRAINT document_sets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5282 (class 2606 OID 25531)
-- Name: docusign_envelope_documents docusign_envelope_documents_envelope_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_envelope_id_fkey FOREIGN KEY (envelope_id) REFERENCES public.docusign_envelopes(id) ON DELETE CASCADE;


--
-- TOC entry 5283 (class 2606 OID 25536)
-- Name: docusign_envelope_documents docusign_envelope_documents_project_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_project_document_id_fkey FOREIGN KEY (project_document_id) REFERENCES public.project_documents(id) ON DELETE RESTRICT;


--
-- TOC entry 5284 (class 2606 OID 25541)
-- Name: docusign_envelope_documents docusign_envelope_documents_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_documents
    ADD CONSTRAINT docusign_envelope_documents_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.docusign_templates(id) ON DELETE SET NULL;


--
-- TOC entry 5285 (class 2606 OID 25572)
-- Name: docusign_envelope_recipients docusign_envelope_recipients_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_recipients
    ADD CONSTRAINT docusign_envelope_recipients_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- TOC entry 5286 (class 2606 OID 25567)
-- Name: docusign_envelope_recipients docusign_envelope_recipients_envelope_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelope_recipients
    ADD CONSTRAINT docusign_envelope_recipients_envelope_id_fkey FOREIGN KEY (envelope_id) REFERENCES public.docusign_envelopes(id) ON DELETE CASCADE;


--
-- TOC entry 5280 (class 2606 OID 25505)
-- Name: docusign_envelopes docusign_envelopes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelopes
    ADD CONSTRAINT docusign_envelopes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5281 (class 2606 OID 25510)
-- Name: docusign_envelopes docusign_envelopes_sent_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_envelopes
    ADD CONSTRAINT docusign_envelopes_sent_by_user_id_fkey FOREIGN KEY (sent_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5279 (class 2606 OID 25485)
-- Name: docusign_template_fields docusign_template_fields_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_template_fields
    ADD CONSTRAINT docusign_template_fields_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.docusign_templates(id) ON DELETE CASCADE;


--
-- TOC entry 5276 (class 2606 OID 25462)
-- Name: docusign_templates docusign_templates_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5277 (class 2606 OID 25452)
-- Name: docusign_templates docusign_templates_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE CASCADE;


--
-- TOC entry 5278 (class 2606 OID 25457)
-- Name: docusign_templates docusign_templates_pdf_reference_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_templates
    ADD CONSTRAINT docusign_templates_pdf_reference_file_id_fkey FOREIGN KEY (pdf_reference_file_id) REFERENCES public.stored_files(id) ON DELETE SET NULL;


--
-- TOC entry 5287 (class 2606 OID 25594)
-- Name: docusign_webhook_events docusign_webhook_events_envelope_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.docusign_webhook_events
    ADD CONSTRAINT docusign_webhook_events_envelope_id_fkey FOREIGN KEY (envelope_id) REFERENCES public.docusign_envelopes(id) ON DELETE CASCADE;


--
-- TOC entry 5241 (class 2606 OID 24931)
-- Name: google_drive_library_roots google_drive_library_roots_drive_account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_drive_library_roots
    ADD CONSTRAINT google_drive_library_roots_drive_account_user_id_fkey FOREIGN KEY (drive_account_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5269 (class 2606 OID 25318)
-- Name: project_assignments project_assignments_assigned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5270 (class 2606 OID 25308)
-- Name: project_assignments project_assignments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5271 (class 2606 OID 25313)
-- Name: project_assignments project_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_assignments
    ADD CONSTRAINT project_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5263 (class 2606 OID 25223)
-- Name: project_deadlines project_deadlines_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_deadlines
    ADD CONSTRAINT project_deadlines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5273 (class 2606 OID 25599)
-- Name: project_document_files project_document_files_docusign_envelope_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_docusign_envelope_document_id_fkey FOREIGN KEY (docusign_envelope_document_id) REFERENCES public.docusign_envelope_documents(id) ON DELETE SET NULL;


--
-- TOC entry 5274 (class 2606 OID 25366)
-- Name: project_document_files project_document_files_project_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_project_document_id_fkey FOREIGN KEY (project_document_id) REFERENCES public.project_documents(id) ON DELETE CASCADE;


--
-- TOC entry 5275 (class 2606 OID 25371)
-- Name: project_document_files project_document_files_stored_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_files
    ADD CONSTRAINT project_document_files_stored_file_id_fkey FOREIGN KEY (stored_file_id) REFERENCES public.stored_files(id) ON DELETE CASCADE;


--
-- TOC entry 5259 (class 2606 OID 25379)
-- Name: project_document_notes project_document_notes_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_notes
    ADD CONSTRAINT project_document_notes_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5260 (class 2606 OID 25165)
-- Name: project_document_notes project_document_notes_project_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_document_notes
    ADD CONSTRAINT project_document_notes_project_document_id_fkey FOREIGN KEY (project_document_id) REFERENCES public.project_documents(id) ON DELETE CASCADE;


--
-- TOC entry 5254 (class 2606 OID 25143)
-- Name: project_documents project_documents_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5255 (class 2606 OID 25138)
-- Name: project_documents project_documents_current_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_current_file_id_fkey FOREIGN KEY (current_file_id) REFERENCES public.stored_files(id) ON DELETE SET NULL;


--
-- TOC entry 5256 (class 2606 OID 25128)
-- Name: project_documents project_documents_document_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id) ON DELETE SET NULL;


--
-- TOC entry 5257 (class 2606 OID 25123)
-- Name: project_documents project_documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5258 (class 2606 OID 25133)
-- Name: project_documents project_documents_source_document_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_source_document_set_id_fkey FOREIGN KEY (source_document_set_id) REFERENCES public.document_sets(id) ON DELETE SET NULL;


--
-- TOC entry 5239 (class 2606 OID 24909)
-- Name: project_folders project_folders_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_folders
    ADD CONSTRAINT project_folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.project_folders(id) ON DELETE CASCADE;


--
-- TOC entry 5240 (class 2606 OID 24904)
-- Name: project_folders project_folders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_folders
    ADD CONSTRAINT project_folders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5267 (class 2606 OID 25287)
-- Name: project_parties project_parties_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_parties
    ADD CONSTRAINT project_parties_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE RESTRICT;


--
-- TOC entry 5268 (class 2606 OID 25282)
-- Name: project_parties project_parties_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_parties
    ADD CONSTRAINT project_parties_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5261 (class 2606 OID 25198)
-- Name: project_tasks project_tasks_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5262 (class 2606 OID 25193)
-- Name: project_tasks project_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5236 (class 2606 OID 24871)
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- TOC entry 5237 (class 2606 OID 24881)
-- Name: projects projects_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5238 (class 2606 OID 24876)
-- Name: projects projects_escrow_officer_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_escrow_officer_contact_id_fkey FOREIGN KEY (escrow_officer_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- TOC entry 5264 (class 2606 OID 25253)
-- Name: reminder_drafts reminder_drafts_project_deadline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_drafts
    ADD CONSTRAINT reminder_drafts_project_deadline_id_fkey FOREIGN KEY (project_deadline_id) REFERENCES public.project_deadlines(id) ON DELETE SET NULL;


--
-- TOC entry 5265 (class 2606 OID 25248)
-- Name: reminder_drafts reminder_drafts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_drafts
    ADD CONSTRAINT reminder_drafts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5266 (class 2606 OID 25258)
-- Name: reminder_drafts reminder_drafts_sent_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_drafts
    ADD CONSTRAINT reminder_drafts_sent_by_user_id_fkey FOREIGN KEY (sent_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5242 (class 2606 OID 24962)
-- Name: stored_files stored_files_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.project_folders(id) ON DELETE SET NULL;


--
-- TOC entry 5243 (class 2606 OID 24967)
-- Name: stored_files stored_files_google_drive_library_root_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_google_drive_library_root_id_fkey FOREIGN KEY (google_drive_library_root_id) REFERENCES public.google_drive_library_roots(id) ON DELETE SET NULL;


--
-- TOC entry 5244 (class 2606 OID 24957)
-- Name: stored_files stored_files_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5245 (class 2606 OID 24972)
-- Name: stored_files stored_files_uploaded_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5272 (class 2606 OID 25342)
-- Name: user_invites user_invites_invited_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- Completed on 2026-04-23 14:50:39

--
-- PostgreSQL database dump complete
--

\unrestrict OM6WgHAxTgCQc8S89F7F9tIN5xpYPZezTxBUffSrnfPWhujHeEoMN6mPg98QFRT

