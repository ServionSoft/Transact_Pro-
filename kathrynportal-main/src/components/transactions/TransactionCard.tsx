import { Link } from "react-router-dom";
import type { ProjectListItem } from "@/api/projects";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  docProgressPercent,
  dueDateBucket,
  dueDateClass,
  propertyStreet,
  propertySubline,
  transactionTypeLabel,
} from "@/lib/transactionListUtils";
import { formatUsDateDisplay } from "@/lib/displayFormat";
import TransactionRowMenu from "./TransactionRowMenu";

type Props = {
  project: ProjectListItem;
  clientEmail?: string;
  compact?: boolean;
};

export default function TransactionCard({ project, clientEmail, compact = false }: Props) {
  const docPct = docProgressPercent(project);
  const dueBucket = dueDateBucket(project.nextStepDate);
  const typeLabel = transactionTypeLabel(project.type);

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary/30 hover:shadow-md",
        compact ? "p-3" : "p-5",
      )}
    >
      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <TransactionRowMenu project={project} clientEmail={clientEmail} />
      </div>

      <Link to={`/projects/${project.id}`} className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2 pr-8">
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-semibold text-foreground", compact ? "text-sm" : "text-base")}>
              {propertyStreet(project.propertyAddress)}
            </p>
            {propertySubline(project.propertyAddress) ? (
              <p className="truncate text-xs text-muted-foreground">{propertySubline(project.propertyAddress)}</p>
            ) : null}
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {project.clientName} · {typeLabel}
            </p>
          </div>
          <StatusBadge status={project.stage} type="stage" />
        </div>

        <div className={cn("space-y-3", compact ? "mt-2" : "mt-4")}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">List price</span>
            <span className="font-medium tabular-nums text-foreground">{project.listPrice || "—"}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Documents</span>
              <span className="tabular-nums text-foreground">
                {project.documentsCompleteCount}/{project.documentsTotalCount}
              </span>
            </div>
            <Progress value={docPct} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Next step</span>
            <span className={cn("tabular-nums", dueDateClass(dueBucket))}>
              {project.nextStepDate?.trim() ? formatUsDateDisplay(project.nextStepDate) : "—"}
            </span>
          </div>
        </div>

        {project.nextStep?.trim() ? (
          <p
            className={cn(
              "mt-3 line-clamp-2 border-t border-border pt-3 text-xs text-muted-foreground",
              compact && "mt-2 pt-2",
            )}
          >
            {project.nextStep}
          </p>
        ) : null}
      </Link>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {project.propertyType ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {project.propertyType}
          </Badge>
        ) : null}
        {project.filesCount > 0 ? (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {project.filesCount} file{project.filesCount === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </div>
    </article>
  );
}
