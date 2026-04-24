-- Settings UI baseline rows (names + optional stored_files id); when null, standard docs still come from conditional_rule_sets.
ALTER TABLE public.conditional_rules
  ADD COLUMN IF NOT EXISTS documents_json jsonb;

COMMENT ON COLUMN public.conditional_rules.documents_json IS 'Standard rules from Settings: [{ id, name, required, section?, note?, storedFileId? }]. NULL = hydrate documents from conditional_rule_sets + document_set_members.';
