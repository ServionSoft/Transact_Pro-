import { useNavigate } from "react-router-dom";
import type { ProjectListItem } from "@/api/projects";
import StatusBadge from "@/components/shared/StatusBadge";
import TransactionRowMenu from "@/components/transactions/TransactionRowMenu";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  docProgressPercent,
  dueDateBucket,
  dueDateClass,
  propertyStreet,
  propertySubline,
} from "@/lib/transactionListUtils";

export type NextStepTableRow = ProjectListItem & {
  agentName: string;
  coeDate: string;
  notesPreview: string;
};

type Props = {
  rows: NextStepTableRow[];
  clientEmailById: Map<string, string>;
  loading?: boolean;
};

const compactCellClass =
  "px-1.5 py-2 sm:px-2 sm:py-2.5 lg:px-2.5 [&:has([role=checkbox])]:pr-0";
const compactHeadClass =
  "h-9 px-1.5 text-[10px] font-semibold uppercase tracking-wide sm:h-10 sm:px-2 sm:text-[11px] lg:px-2.5 lg:text-xs [&:has([role=checkbox])]:pr-0";

export function NextStepsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className={compactCellClass}>
            <Skeleton className="h-3.5 w-full max-w-[8rem]" />
            <Skeleton className="mt-1 h-3 w-full max-w-[6rem]" />
          </TableCell>
          <TableCell className={cn("hidden md:table-cell", compactCellClass)}>
            <Skeleton className="h-3.5 w-full max-w-[5rem]" />
          </TableCell>
          <TableCell className={cn("hidden lg:table-cell", compactCellClass)}>
            <Skeleton className="h-3.5 w-14" />
          </TableCell>
          <TableCell className={compactCellClass}>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell className={cn("hidden xl:table-cell", compactCellClass)}>
            <Skeleton className="h-3.5 w-full max-w-[4rem]" />
          </TableCell>
          <TableCell className={compactCellClass}>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="mt-1 h-3 w-12" />
          </TableCell>
          <TableCell className={cn("hidden 2xl:table-cell", compactCellClass)}>
            <Skeleton className="h-1.5 w-full" />
          </TableCell>
          <TableCell className={cn("hidden xl:table-cell", compactCellClass)}>
            <Skeleton className="h-3.5 w-12" />
          </TableCell>
          <TableCell className={cn("hidden xl:table-cell", compactCellClass)}>
            <Skeleton className="h-3.5 w-full max-w-[4rem]" />
          </TableCell>
          <TableCell className={cn("w-9 px-1 sm:w-10", compactCellClass)}>
            <Skeleton className="ml-auto h-7 w-7 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function NextStepsTable({ rows, clientEmailById, loading }: Props) {
  const navigate = useNavigate();

  return (
    <div className="min-w-0 w-full overflow-hidden">
      <Table
        containerClassName="overflow-x-hidden"
        className="table-fixed w-full text-[11px] sm:text-xs lg:text-sm"
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn("w-[26%] sm:w-[22%] lg:w-[18%]", compactHeadClass)}>Property</TableHead>
            <TableHead className={cn("hidden w-[12%] md:table-cell lg:w-[10%]", compactHeadClass)}>Contact</TableHead>
            <TableHead className={cn("hidden w-[8%] lg:table-cell", compactHeadClass)}>Type</TableHead>
            <TableHead className={cn("w-[20%] sm:w-[16%] lg:w-[12%]", compactHeadClass)}>Stage</TableHead>
            <TableHead className={cn("hidden w-[9%] xl:table-cell", compactHeadClass)}>Agent</TableHead>
            <TableHead className={compactHeadClass}>Next step</TableHead>
            <TableHead className={cn("hidden 2xl:table-cell", compactHeadClass)}>Docs</TableHead>
            <TableHead className={cn("hidden xl:table-cell", compactHeadClass)}>COE</TableHead>
            <TableHead className={cn("hidden xl:table-cell", compactHeadClass)}>Notes</TableHead>
            <TableHead className={cn("w-9 px-1 text-right sm:w-10", compactHeadClass)}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <NextStepsTableSkeleton />
          ) : (
            rows.map((project) => {
              const dueBucket = dueDateBucket(project.nextStepDate);
              const isOverdue = dueBucket === "overdue";
              const docPct = docProgressPercent(project);
              const stepLabel = project.nextStep?.trim() || "—";
              const subline = propertySubline(project.propertyAddress);

              return (
                <TableRow
                  key={project.id}
                  className={cn(
                    "cursor-pointer",
                    isOverdue && "bg-destructive/10 hover:bg-destructive/15",
                    !isOverdue && "hover:bg-muted/50",
                  )}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <TableCell className={compactCellClass}>
                    <p className="truncate font-medium leading-snug text-foreground">
                      {propertyStreet(project.propertyAddress)}
                    </p>
                    {subline ? (
                      <p className="truncate text-[10px] leading-snug text-muted-foreground sm:text-[11px] lg:text-xs">
                        {subline}
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground md:hidden sm:text-[11px]">
                      {project.clientName}
                    </p>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden truncate text-foreground md:table-cell",
                      compactCellClass,
                    )}
                  >
                    {project.clientName}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden truncate text-muted-foreground lg:table-cell",
                      compactCellClass,
                    )}
                  >
                    {project.type}
                  </TableCell>
                  <TableCell className={compactCellClass}>
                    <StatusBadge
                      status={project.stage}
                      type="stage"
                      className="max-w-full truncate px-1.5 py-0 text-[9px] sm:px-2 sm:text-[10px] lg:text-xs"
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden truncate text-foreground xl:table-cell",
                      compactCellClass,
                    )}
                    title={project.agentName}
                  >
                    {project.agentName}
                  </TableCell>
                  <TableCell className={compactCellClass}>
                    <p
                      className={cn(
                        "truncate font-medium leading-snug",
                        isOverdue ? "text-destructive" : "text-foreground",
                      )}
                      title={stepLabel}
                    >
                      {stepLabel}
                    </p>
                    <p className={cn("truncate tabular-nums leading-snug text-[10px] sm:text-[11px] lg:text-xs", dueDateClass(dueBucket))}>
                      {project.nextStepDate?.trim() || "—"}
                    </p>
                  </TableCell>
                  <TableCell className={cn("hidden 2xl:table-cell", compactCellClass)}>
                    <div className="space-y-1">
                      <span className="text-[10px] tabular-nums text-muted-foreground lg:text-xs">
                        {project.documentsCompleteCount}/{project.documentsTotalCount}
                      </span>
                      <Progress value={docPct} className="h-1" />
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden truncate tabular-nums text-muted-foreground xl:table-cell",
                      compactCellClass,
                    )}
                  >
                    {project.coeDate?.trim() || "—"}
                  </TableCell>
                  <TableCell className={cn("hidden xl:table-cell", compactCellClass)}>
                    {project.notesPreview ? (
                      <p
                        className="truncate text-[10px] text-muted-foreground lg:text-xs"
                        title={project.notesPreview}
                      >
                        {project.notesPreview}
                      </p>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/70 lg:text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn("w-9 px-1 text-right sm:w-10", compactCellClass)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TransactionRowMenu
                      project={project}
                      clientEmail={clientEmailById.get(project.clientId)}
                      showEditNextStep
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
