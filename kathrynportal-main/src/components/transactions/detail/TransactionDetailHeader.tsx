import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, PenLine, Trash2 } from "lucide-react";
import type { Project } from "@/data/mockData";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { propertyStreet, propertySubline, transactionTypeLabel } from "@/lib/transactionListUtils";
import { cn } from "@/lib/utils";

type Props = {
  project: Project;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
  onOpenEmail?: () => void;
};

export default function TransactionDetailHeader({ project, canDelete, deleting, onDelete, onOpenEmail }: Props) {
  const navigate = useNavigate();
  const street = propertyStreet(project.propertyAddress);
  const subline = propertySubline(project.propertyAddress);
  const typeLabel = transactionTypeLabel(project.type);
  const isBuyer = typeLabel === "Buyer File";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => navigate("/projects")}
        className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Transactions
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-xl font-bold text-foreground md:text-2xl">{street}</h1>
            <StatusBadge status={project.stage} type="stage" />
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                isBuyer ? "bg-info/15 text-info" : "bg-accent/15 text-accent-foreground",
              )}
            >
              {typeLabel}
            </span>
          </div>
          {subline ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{subline}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">
            <Link to={`/clients/${project.clientId}`} className="font-medium text-foreground hover:text-accent">
              {project.clientName}
            </Link>
            <span className="mx-1.5">·</span>
            {project.listPrice || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            type="button"
            onClick={() => onOpenEmail?.()}
          >
            <Mail className="h-3.5 w-3.5" /> Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => navigate(`/projects/${project.id}/edit`)}
          >
            <PenLine className="h-3.5 w-3.5" /> Update
          </Button>
          {canDelete ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Delete"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
