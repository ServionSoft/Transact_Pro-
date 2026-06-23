ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS task_section character varying(128),
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instruction_url character varying(2048),
  ADD COLUMN IF NOT EXISTS template_item_key character varying(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_tasks_project_template_key
  ON public.project_tasks (project_id, template_item_key)
  WHERE template_item_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_sort
  ON public.project_tasks (project_id, sort_order, created_at);
