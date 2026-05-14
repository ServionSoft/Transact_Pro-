-- Company-level eSign settings (single row, id=1).
-- Stores default vendor signer identity + signature file reference.

CREATE TABLE IF NOT EXISTS public.esign_settings (
    id integer PRIMARY KEY DEFAULT 1,
    vendor_name character varying(255) NOT NULL DEFAULT '',
    vendor_email character varying(512) NOT NULL DEFAULT '',
    vendor_signature_file_id bigint,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT esign_settings_singleton_check CHECK (id = 1)
);

ALTER TABLE ONLY public.esign_settings
    ADD CONSTRAINT esign_settings_vendor_signature_file_id_fkey
    FOREIGN KEY (vendor_signature_file_id) REFERENCES public.stored_files(id) ON DELETE SET NULL;

INSERT INTO public.esign_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

