import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { ProjectListItem } from "@/api/projects";
import type { ProjectStage } from "@/data/mockData";
import { cn } from "@/lib/utils";
import {
  KANBAN_STAGES,
  STAGE_PILL_COLORS,
  dueDateBucket,
  dueDateClass,
  filterTransactions,
  isBuyerTransaction,
  propertyStreet,
} from "@/lib/transactionListUtils";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  rows: ProjectListItem[];
  search: string;
  loading?: boolean;
};

const COLUMN_CLASS = "flex w-[min(72vw,240px)] shrink-0 flex-col sm:w-[min(68vw,260px)] lg:w-[280px]";

function KanbanBoard({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-w-0">
      <p className="mb-2 flex items-center gap-1 text-[11px] text-muted-foreground lg:hidden">
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Swipe sideways to see all stages
      </p>
      <div className="-mx-1 flex min-h-0 gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 snap-x snap-mandatory scroll-px-2 lg:gap-4 lg:pb-2">
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent lg:hidden"
        aria-hidden
      />
    </div>
  );
}

export default function TransactionsKanban({ rows, search, loading }: Props) {
  if (loading) {
    return (
      <KanbanBoard>
        {KANBAN_STAGES.map((stage) => (
          <div key={stage} className={cn(COLUMN_CLASS, "snap-start space-y-3")}>
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </KanbanBoard>
    );
  }

  return (
    <KanbanBoard>
      {KANBAN_STAGES.map((stage) => {
        const stageProjects = filterTransactions(rows, search, stage);
        const listingOnly = stage === "Listing Prep" || stage === "Listing Complete";
        return (
          <div key={stage} className={cn(COLUMN_CLASS, "snap-start")}>
            <div className="mb-3 flex items-center gap-2 px-1">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold",
                  STAGE_PILL_COLORS[stage as ProjectStage],
                )}
              >
                {stage}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{stageProjects.length}</span>
              {listingOnly ? (
                <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Listings only
                </span>
              ) : null}
            </div>
            <div className="min-h-[120px] flex-1 space-y-3 rounded-lg bg-muted/30 p-2">
              {stageProjects.map((project) => {
                const isBuyer = isBuyerTransaction(project.type);
                const naForBuyer = isBuyer && listingOnly;
                const dueBucket = dueDateBucket(project.nextStepDate);
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className={cn(
                      "block rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-primary/30 hover:shadow-md",
                      naForBuyer && "opacity-60",
                    )}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="flex-1 truncate text-sm font-medium text-foreground">
                        {propertyStreet(project.propertyAddress)}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          isBuyer ? "bg-info/15 text-info" : "bg-accent/15 text-accent-foreground",
                        )}
                      >
                        {isBuyer ? "Buyer" : "Listing"}
                      </span>
                    </div>
                    <p className="mb-2 truncate text-xs text-muted-foreground">{project.clientName}</p>
                    {naForBuyer ? (
                      <p className="mb-1 text-[10px] italic text-muted-foreground">N/A for buyer files</p>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                      <span className={cn("tabular-nums", dueDateClass(dueBucket))}>
                        {project.nextStepDate?.trim() ? `Due ${project.nextStepDate}` : "No date"}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">{project.listPrice || "—"}</span>
                    </div>
                  </Link>
                );
              })}
              {stageProjects.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {listingOnly ? "Listings only" : "No transactions"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </KanbanBoard>
  );
}
