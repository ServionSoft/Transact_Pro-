ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS template_key character varying(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_template_key_active
  ON public.email_templates (lower(btrim(template_key)))
  WHERE template_key IS NOT NULL AND deleted_at IS NULL;

UPDATE public.email_templates
SET template_key = 'timeline_parties', updated_at = now()
WHERE lower(btrim(name)) = lower('Transaction Timeline')
  AND deleted_at IS NULL
  AND (template_key IS NULL OR btrim(template_key) = '');

INSERT INTO public.email_templates (name, category, subject, body, template_key, is_active, created_at, updated_at)
SELECT t.name, t.category, t.subject, t.body, t.template_key, true, now(), now()
FROM (
  VALUES
    (
      'Transaction Timeline — Client',
      'Client Email',
      'Your transaction timeline — {{property_street}}',
      'Hi {{client_name}},\n\nPlease find the timeline for {{property_address}} below:\n\n{{timeline_table}}\n\nEscrow officer: {{escrow_officer}}\nEscrow company: {{escrow_company}}\n\nPlease let us know if you have any questions.\n\nBest regards,\nKathryn Santos',
      'timeline_client'
    ),
    (
      'Notes and Questions — Buyer''s Agent',
      'Agent Email',
      'Notes and Questions — {{property_street}}',
      'Hi {{agent_name}},\n\nI have a few notes and questions regarding {{property_address}}:\n\n{{update_details}}\n\nThank you,\nKathryn Santos',
      'notes_questions_ba'
    ),
    (
      'Buyer Signed Docs to LA/TC',
      'Agent Email',
      'Buyer signed documents — {{property_street}}',
      'Hi,\n\nPlease find the buyer signed disclosure documents for {{property_address}} attached / linked below.\n\n{{update_details}}\n\nThank you,\nKathryn Santos',
      'buyer_signed_docs_la_tc'
    ),
    (
      'Listing Questions to Agent',
      'Agent Email',
      'Listing questions — {{property_street}}',
      'Hi {{agent_name}},\n\nI have a few listing questions regarding {{property_address}}:\n\n{{update_details}}\n\nThank you,\nKathryn Santos',
      'listing_questions_agent'
    ),
    (
      'Listing Disclosure Intro — Client',
      'Client Email',
      'Seller disclosures preview — {{property_street}}',
      'Hi {{client_name}},\n\nHere is a preview of the disclosures to complete for {{property_address}}:\n\n{{update_details}}\n\nThank you,\nKathryn Santos',
      'listing_disclosure_intro_client'
    ),
    (
      'Additional Disclosures — Seller Review',
      'Client Email',
      'Additional disclosures to review — {{property_street}}',
      'Hi {{client_name}},\n\nPlease review the additional disclosures for {{property_address}}:\n\n{{update_details}}\n\nThank you,\nKathryn Santos',
      'listing_additional_disclosures_seller'
    ),
    (
      'NHD Invoice to Escrow',
      'Agent Email',
      'NHD invoice — {{property_street}}',
      'Hi,\n\nPlease find the NHD invoice for {{property_address}}.\n\n{{update_details}}\n\nThank you,\nKathryn Santos',
      'nhd_invoice_escrow'
    )
) AS t(name, category, subject, body, template_key)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.email_templates et
  WHERE lower(btrim(et.template_key)) = lower(btrim(t.template_key))
    AND et.deleted_at IS NULL
);
