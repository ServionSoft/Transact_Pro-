DO $$ BEGIN
  CREATE TYPE public.project_task_type AS ENUM ('general', 'email');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS task_type public.project_task_type NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS email_template_id bigint REFERENCES public.email_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_email character varying(320);

CREATE INDEX IF NOT EXISTS idx_project_tasks_task_type ON public.project_tasks (task_type);
