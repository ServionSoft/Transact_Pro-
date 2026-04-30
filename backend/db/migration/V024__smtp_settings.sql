-- Organization SMTP settings (single row). Password stored encrypted at rest (see API; key derived from JWT_ACCESS_SECRET).

CREATE TABLE public.smtp_settings (
  id bigint NOT NULL,
  host character varying(255) NOT NULL DEFAULT ''::character varying,
  port integer NOT NULL DEFAULT 587,
  secure boolean NOT NULL DEFAULT false,
  auth_user character varying(320) NOT NULL DEFAULT ''::character varying,
  password_encrypted text,
  from_email character varying(320) NOT NULL DEFAULT ''::character varying,
  from_name character varying(200) NOT NULL DEFAULT ''::character varying,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT smtp_settings_pkey PRIMARY KEY (id),
  CONSTRAINT smtp_settings_singleton CHECK (id = 1)
);

INSERT INTO public.smtp_settings (id, host, port, secure, auth_user, password_encrypted, from_email, from_name)
VALUES (1, '', 587, false, '', NULL, '', '')
ON CONFLICT (id) DO NOTHING;
