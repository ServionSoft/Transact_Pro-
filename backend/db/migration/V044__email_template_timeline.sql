INSERT INTO public.email_templates (name, category, subject, body, is_active, created_at, updated_at)
SELECT t.name, t.category, t.subject, t.body, true, now(), now()
FROM (
  VALUES
    (
      'Transaction Timeline',
      'Agent Email',
      'Timeline — {{property_street}}',
      'Hi {{agent_name}},\n\nPlease find the transaction timeline for {{property_address}} below:\n\n{{timeline_table}}\n\nEscrow officer: {{escrow_officer}}\nEscrow company: {{escrow_company}}\n\nBest regards,\nKathryn Santos'
    )
) AS t(name, category, subject, body)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.email_templates et
  WHERE lower(btrim(et.name)) = lower(btrim(t.name))
    AND et.deleted_at IS NULL
);
