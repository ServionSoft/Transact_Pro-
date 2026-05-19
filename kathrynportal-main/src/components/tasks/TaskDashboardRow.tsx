import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, FileText, Loader2, Mail, Pencil } from "lucide-react";
import type { Project, ProjectStage } from "@/data/mockData";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projectDetailState } from "@/lib/projectDetailNavigation";
import { getTransactionRecipientSuggestions } from "@/lib/transactionRecipientSuggestions";
import { dueDateBucket, dueDateClass, propertyStreet } from "@/lib/transactionListUtils";
import type { Client, ProjectTask } from "@/data/mockData";
import { cn } from "@/lib/utils";

export type TaskDashboardRowData = {
  id: string;
  taskId: string;
  title: string;
  dueDate: string;
  projectId: string;
  clientId: string;
  propertyAddress: string;
  clientName: string;
  stage: string;
  status: ProjectTask["status"];
  assignedTo: string;
};

type Props = {
  task: TaskDashboardRowData;
  project?: Project;
  client?: Client;
  completing: boolean;
  canEdit: boolean;
  onMarkDone: () => void;
};

function primaryEmail(project: Project | undefined, client: Client | undefined): string {
  if (!project) return client?.email?.trim() ?? "";
  const suggestions = getTransactionRecipientSuggestions(project, client);
  return suggestions[0]?.email ?? client?.email?.trim() ?? "";
}

export default function TaskDashboardRow({
  task,
  project,
  client,
  completing,
  canEdit,
  onMarkDone,
}: Props) {
  const navigate = useNavigate();
  const dueBucket = dueDateBucket(task.dueDate);
  const street = propertyStreet(task.propertyAddress);

  const openProject = () => {
    navigate(`/projects/${task.projectId}`);
  };

  const openTasks = () => {
    navigate(`/projects/${task.projectId}`, { state: projectDetailState("tasks") });
  };

  const openEmail = () => {
    const email = primaryEmail(project, client);
    navigate(`/projects/${task.projectId}`, {
      state: projectDetailState("emails", { composeEmail: email || undefined }),
    });
  };

  const openDocuments = () => {
    navigate(`/projects/${task.projectId}`, { state: projectDetailState("documents") });
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 transition-colors hover:bg-muted/20 sm:items-center sm:px-4",
        dueBucket === "overdue" && "border-l-2 border-l-destructive bg-destructive/5",
        dueBucket === "today" && "border-l-2 border-l-amber-500",
      )}
    >
      <button
        type="button"
        onClick={onMarkDone}
        disabled={!canEdit || completing}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors sm:mt-0",
          completing
            ? "border-muted"
            : "border-border hover:border-primary",
        )}
        aria-label="Mark complete"
      >
        {completing ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/projects/${task.projectId}`}
            state={projectDetailState("tasks")}
            className={cn(
              "text-sm font-medium hover:text-accent",
              dueBucket === "overdue" ? "text-destructive" : "text-foreground",
            )}
          >
            {task.title}
          </Link>
          {task.status !== "Complete" ? (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold",
                task.status === "In Progress"
                  ? "border-info/40 bg-info/10 text-info"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {task.status}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <Link to={`/projects/${task.projectId}`} className="font-medium text-foreground/80 hover:text-accent">
            {street}
          </Link>
          <span aria-hidden>·</span>
          <Link to={`/clients/${task.clientId}`} className="hover:text-accent">
            {task.clientName}
          </Link>
          <span aria-hidden>·</span>
          <StatusBadge status={task.stage as ProjectStage} type="stage" className="text-[10px] px-1.5 py-0" />
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground md:hidden">
          {task.assignedTo}
          <span className="mx-1">·</span>
          <span className={cn("tabular-nums", dueDateClass(dueBucket))}>Due {task.dueDate || "—"}</span>
        </p>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className={cn("text-xs tabular-nums", dueDateClass(dueBucket))}>Due {task.dueDate || "—"}</span>
        <span className="max-w-[140px] truncate text-[11px] text-muted-foreground">{task.assignedTo}</span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Tasks on transaction" onClick={openTasks}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Compose email" onClick={openEmail}>
          <Mail className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Documents" onClick={openDocuments}>
          <FileText className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Open transaction" onClick={openProject}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
