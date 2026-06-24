import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, FileText, Mail, MoreHorizontal, Pencil } from "lucide-react";
import type { Project, ProjectStage } from "@/data/mockData";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { projectDetailState } from "@/lib/projectDetailNavigation";
import { getTransactionRecipientSuggestions } from "@/lib/transactionRecipientSuggestions";
import { dueDateBucket, dueDateClass, propertyStreet } from "@/lib/transactionListUtils";
import type { Client } from "@/data/mockData";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type TaskDashboardRowData = {
  id: string;
  projectId: string;
  nextStep: string;
  nextStepDate: string;
  clientId: string;
  propertyAddress: string;
  clientName: string;
  stage: string;
  assignedTo: string;
};

type Props = {
  row: TaskDashboardRowData;
  project?: Project;
  client?: Client;
};

function primaryEmail(project: Project | undefined, client: Client | undefined): string {
  if (!project) return client?.email?.trim() ?? "";
  const suggestions = getTransactionRecipientSuggestions(project, client);
  return suggestions[0]?.email ?? client?.email?.trim() ?? "";
}

export default function TaskDashboardRow({ row, project, client }: Props) {
  const navigate = useNavigate();
  const dueBucket = dueDateBucket(row.nextStepDate);
  const street = propertyStreet(row.propertyAddress);
  const stepLabel = row.nextStep?.trim() || "No next step set";

  const openProject = () => {
    navigate(`/projects/${row.projectId}`);
  };

  const openOverview = () => {
    navigate(`/projects/${row.projectId}`, { state: projectDetailState("overview") });
  };

  const openEmail = () => {
    const email = primaryEmail(project, client);
    navigate(`/projects/${row.projectId}`, {
      state: projectDetailState("emails", { composeEmail: email || undefined }),
    });
  };

  const openDocuments = () => {
    navigate(`/projects/${row.projectId}`, { state: projectDetailState("documents") });
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 transition-colors hover:bg-muted/20 sm:items-center sm:px-4",
        dueBucket === "overdue" && "border-l-2 border-l-destructive bg-destructive/5",
        dueBucket === "today" && "border-l-2 border-l-amber-500",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/projects/${row.projectId}`}
            state={projectDetailState("overview")}
            className={cn(
              "text-sm font-medium hover:text-accent",
              dueBucket === "overdue" ? "text-destructive" : "text-foreground",
            )}
          >
            {stepLabel}
          </Link>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <Link to={`/projects/${row.projectId}`} className="font-medium text-foreground/80 hover:text-accent">
            {street}
          </Link>
          <span aria-hidden>·</span>
          <Link to={`/clients/${row.clientId}`} className="hover:text-accent">
            {row.clientName}
          </Link>
          <span aria-hidden>·</span>
          <StatusBadge status={row.stage as ProjectStage} type="stage" className="text-[10px] px-1.5 py-0" />
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground md:hidden">
          {row.assignedTo}
          <span className="mx-1">·</span>
          <span className={cn("tabular-nums", dueDateClass(dueBucket))}>
            {row.nextStepDate?.trim() ? row.nextStepDate : "No date"}
          </span>
        </p>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className={cn("text-xs tabular-nums", dueDateClass(dueBucket))}>
          {row.nextStepDate?.trim() ? row.nextStepDate : "No date"}
        </span>
        <span className="max-w-[140px] truncate text-[11px] text-muted-foreground">{row.assignedTo}</span>
      </div>

      <div className="hidden shrink-0 items-center gap-0.5 md:flex">
        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit next step" onClick={openOverview}>
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10 w-10 shrink-0 p-0 md:hidden"
            aria-label="Next step actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={openOverview}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit next step
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Compose email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openDocuments}>
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openProject}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open transaction
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
