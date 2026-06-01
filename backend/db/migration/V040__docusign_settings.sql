-- Singleton DocuSign JWT integration settings (replaces DOCUSIGN_* env for runtime).

CREATE TABLE IF NOT EXISTS public.docusign_settings (
    id integer PRIMARY KEY DEFAULT 1,
    environment character varying(16) NOT NULL DEFAULT 'demo',
    integration_key character varying(64) NOT NULL DEFAULT '',
    user_id character varying(64) NOT NULL DEFAULT '',
    account_id character varying(64) NOT NULL DEFAULT '',
    base_path character varying(256) NOT NULL DEFAULT 'https://demo.docusign.net/restapi',
    oauth_host character varying(128) NOT NULL DEFAULT 'account-d.docusign.com',
    consent_redirect_uri character varying(512) NOT NULL DEFAULT 'https://www.docusign.com',
    private_key_encrypted text,
    connect_hmac_key_encrypted text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT docusign_settings_singleton_check CHECK (id = 1),
    CONSTRAINT docusign_settings_environment_check CHECK (environment IN ('demo', 'production'))
);

INSERT INTO public.docusign_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
