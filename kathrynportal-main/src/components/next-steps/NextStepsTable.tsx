import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ProjectListItem } from "@/api/projects";
import StatusBadge from "@/components/shared/StatusBadge";
import TransactionRowMenu from "@/components/transactions/TransactionRowMenu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  dueDateBucket,
  dueDateClass,
  propertyStreet,
  propertySubline,
} from "@/lib/transactionListUtils";
import { formatUsDateDisplay } from "@/lib/displayFormat";

export type NextStepTableRow = ProjectListItem & {
  agentName: string;
  coeDate: string;
  notesPreview: string;
};

type SortKey = "property" | "type" | "stage" | "agent" | "nextStep" | "nextStepDate" | "coe";
type SortDir = "asc" | "desc";

type Props = {
  rows: NextStepTableRow[];
  clientEmailById: Map<string, string>;
  loading?: boolean;
};

const compactCellClass =
  "px-1.5 py-2 sm:px-2 sm:py-2.5 lg:px-2.5 [&:has([role=checkbox])]:pr-0";
const compactHeadClass =
  "h-9 px-1.5 text-[10px] font-semibold uppercase tracking-wide sm:h-10 sm:px-2 sm:text-[11px] lg:px-2.5 lg:text-xs [&:has([role=checkbox])]:pr-0";

function parseDateMs(raw: string | undefined): number {
  const trimmed = raw?.trim();
  if (!trimmed) return Number.POSITIVE_INFINITY;
  const ms = new Date(trimmed).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

function compareRows(a: NextStepTableRow, b: NextStepTableRow, key: SortKey, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;
  let cmp = 0;
  switch (key) {
    case "property":
      cmp = propertyStreet(a.propertyAddress).localeCompare(propertyStreet(b.propertyAddress));
      break;
    case "type":
      cmp = a.type.localeCompare(b.type);
      break;
    case "stage":
      cmp = a.stage.localeCompare(b.stage);
      break;
    case "agent":
      cmp = a.agentName.localeCompare(b.agentName);
      break;
    case "nextStep":
      cmp = (a.nextStep?.trim() || "").localeCompare(b.nextStep?.trim() || "");
      break;
    case "nextStepDate": {
      const da = parseDateMs(a.nextStepDate);
      const db = parseDateMs(b.nextStepDate);
      cmp = da === db ? 0 : da < db ? -1 : 1;
      // Empty dates always last, regardless of direction.
      if (!a.nextStepDate?.trim() && b.nextStepDate?.trim()) return 1;
      if (a.nextStepDate?.trim() && !b.nextStepDate?.trim()) return -1;
      break;
    }
    case "coe": {
      const da = parseDateMs(a.coeDate === "—" ? "" : a.coeDate);
      const db = parseDateMs(b.coeDate === "—" ? "" : b.coeDate);
      cmp = da === db ? 0 : da < db ? -1 : 1;
      if ((!a.coeDate?.trim() || a.coeDate === "—") && b.coeDate?.trim() && b.coeDate !== "—") return 1;
      if (a.coeDate?.trim() && a.coeDate !== "—" && (!b.coeDate?.trim() || b.coeDate === "—")) return -1;
      break;
    }
  }
  if (cmp !== 0) return cmp * mul;
  return propertyStreet(a.propertyAddress).localeCompare(propertyStreet(b.propertyAddress));
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <TableHead className={cn(compactHeadClass, className)}>
      <button
        type="button"
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-sm text-left uppercase tracking-wide hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
      >
        <span className="truncate">{label}</span>
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="h-3 w-3 shrink-0" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}

export function NextStepsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className={compactCellClass}>
            <Skeleton className="h-3.5 w-full max-w-[8rem]" />
            <Skeleton className="mt-1 h-3 w-full max-w-[6rem]" />
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
          </TableCell>
          <TableCell className={cn("hidden sm:table-cell", compactCellClass)}>
            <Skeleton className="h-3.5 w-16" />
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
  const [sortKey, setSortKey] = useState<SortKey>("nextStepDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [rows, sortKey, sortDir],
  );

  return (
    <div className="min-w-0 w-full overflow-hidden">
      <Table
        containerClassName="overflow-x-hidden"
        className="table-fixed w-full text-[11px] sm:text-xs lg:text-sm"
      >
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead
              label="Property"
              sortKey="property"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
              className="w-[22%] sm:w-[18%] lg:w-[16%]"
            />
            <SortableHead
              label="Type"
              sortKey="type"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
              className="hidden w-[8%] lg:table-cell"
            />
            <SortableHead
              label="Stage"
              sortKey="stage"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
              className="w-[14%] sm:w-[12%] lg:w-[10%]"
            />
            <SortableHead
              label="Agent"
              sortKey="agent"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
              className="hidden w-[10%] xl:table-cell"
            />
            <SortableHead
              label="Next step"
              sortKey="nextStep"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
              className="w-[30%] sm:w-[28%] lg:w-[26%]"
            />
            <SortableHead
              label="Next step date"
              sortKey="nextStepDate"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
              className="hidden w-[12%] sm:table-cell lg:w-[11%]"
            />
            <SortableHead
              label="COE"
              sortKey="coe"
              activeKey={sortKey}
              dir={sortDir}
              onSort={handleSort}
              className="hidden w-[9%] xl:table-cell"
            />
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
            sortedRows.map((project) => {
              const dueBucket = dueDateBucket(project.nextStepDate);
              const isOverdue = dueBucket === "overdue";
              const stepLabel = project.nextStep?.trim() || "—";
              const dateLabel = project.nextStepDate?.trim()
                ? formatUsDateDisplay(project.nextStepDate)
                : "—";
              const coeLabel = project.coeDate?.trim() ? formatUsDateDisplay(project.coeDate) : "—";
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
                  <TableCell className={compactCellClass} onClick={(e) => e.stopPropagation()}>
                    {stepLabel !== "—" ? (
                      <HoverCard openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <div className="min-w-0 cursor-default text-left">
                            <p
                              className={cn(
                                "line-clamp-2 font-medium leading-snug",
                                isOverdue ? "text-destructive" : "text-foreground",
                              )}
                            >
                              {stepLabel}
                            </p>
                            {/* Date column hidden below sm — keep it under the step text. */}
                            <p
                              className={cn(
                                "mt-0.5 truncate tabular-nums leading-snug text-[10px] sm:hidden",
                                dueDateClass(dueBucket),
                              )}
                            >
                              {dateLabel}
                            </p>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent
                          side="top"
                          align="start"
                          sideOffset={8}
                          collisionPadding={16}
                          className="z-[200] w-[min(100vw-2rem,28rem)] max-h-[min(70vh,24rem)] overflow-y-auto border border-border bg-popover p-4 text-popover-foreground shadow-lg"
                        >
                          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                            {stepLabel}
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    ) : (
                      <>
                        <p className="truncate font-medium leading-snug text-foreground">{stepLabel}</p>
                        <p
                          className={cn(
                            "mt-0.5 truncate tabular-nums leading-snug text-[10px] sm:hidden",
                            dueDateClass(dueBucket),
                          )}
                        >
                          {dateLabel}
                        </p>
                      </>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden tabular-nums sm:table-cell",
                      compactCellClass,
                      dueDateClass(dueBucket),
                    )}
                  >
                    {dateLabel}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden truncate tabular-nums text-muted-foreground xl:table-cell",
                      compactCellClass,
                    )}
                  >
                    {coeLabel}
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
