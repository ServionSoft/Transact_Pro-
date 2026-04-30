ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS source_rule_id bigint NULL REFERENCES public.conditional_rules(id) ON DELETE SET NULL;

ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS source_rule_action_id text NULL;

CREATE INDEX IF NOT EXISTS idx_project_documents_source_rule_id
  ON public.project_documents(source_rule_id);
