-- UI grouping for checklist templates; conditional overlay actions not modeled in conditional_rule_documents alone.
ALTER TABLE public.document_set_members
  ADD COLUMN IF NOT EXISTS section_label character varying(255);

COMMENT ON COLUMN public.document_set_members.section_label IS 'Optional section heading (e.g. Listing Agreement Documents) for Settings / checklist UI.';

ALTER TABLE public.conditional_rules
  ADD COLUMN IF NOT EXISTS actions_json jsonb;

COMMENT ON COLUMN public.conditional_rules.actions_json IS 'Conditional rule actions: [{ documentName, action, note? }] matching app RuleDocumentAction. Used when kind = conditional.';
