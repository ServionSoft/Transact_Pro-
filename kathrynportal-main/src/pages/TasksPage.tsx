import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Clock, Search } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { isTransactionProject, type Project } from "@/data/mockData";
import { getProjectFromApi, listProjectsFromApi, type ProjectListItem } from "@/api/projects";
import { getApiBaseUrl } from "@/lib/apiConfig";
import PageHeader from "@/components/shared/PageHeader";
import TaskDashboardRow, { type TaskDashboardRowData } from "@/components/tasks/TaskDashboardRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { dueDateBucket } from "@/lib/transactionListUtils";
import { listPageBodyClass, listPageRootClass, listPageShellClass } from "@/lib/listPageLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type BucketFilter = "all" | "overdue" | "today" | "upcoming";

function assigneeLabel(project: Project): string {
  const assignees = project.assignees ?? [];
  if (assignees.length === 0) return "Unassigned";
  const first = assignees[0]!.name?.trim() || "Team member";
  if (assignees.length === 1) return first;
  return `${first} +${assignees.length - 1}`;
}

function hasNextStep(project: Project): boolean {
  return Boolean(project.nextStep?.trim() || project.nextStepDate?.trim());
}

function matchesBucketFilter(bucket: ReturnType<typeof dueDateBucket>, filter: BucketFilter): boolean {
  if (filter === "all") return true;
  if (filter === "overdue") return bucket === "overdue";
  if (filter === "today") return bucket === "today";
  return bucket === "week" || bucket === "later";
}

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<BucketFilter>("all");
  const [loading, setLoading] = useState(false);
  const [apiProjects, setApiProjects] = useState<Project[]>([]);
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const upsertProject = useAppStore((s) => s.upsertProject);
  const apiOn = Boolean(getApiBaseUrl());

  useEffect(() => {
    if (!apiOn) {
      setApiProjects([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listProjectsFromApi()
      .then(async (rows: ProjectListItem[]) => {
        const ids = rows
          .filter((p) => p.type === "Listing" || p.type === "Buyer File")
          .map((p) => p.id);
        const detailed = await Promise.all(ids.map((id) => getProjectFromApi(id).catch(() => null)));
        if (cancelled) return;
        const valid = detailed.filter((p): p is NonNullable<typeof p> => Boolean(p));
        setApiProjects(valid);
        valid.forEach((p) => upsertProject(p));
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error("Could not load next steps.", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
        setApiProjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, upsertProject]);

  const transactionProjects = useMemo(
    () => (apiOn ? apiProjects : projects).filter(isTransactionProject),
    [apiOn, apiProjects, projects],
  );

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of transactionProjects) map.set(p.id, p);
    return map;
  }, [transactionProjects]);

  const allRows = useMemo<TaskDashboardRowData[]>(() => {
    return transactionProjects
      .filter(hasNextStep)
      .map((p) => ({
        id: p.id,
        projectId: p.id,
        nextStep: p.nextStep ?? "",
        nextStepDate: p.nextStepDate ?? "",
        clientId: p.clientId,
        propertyAddress: p.propertyAddress,
        clientName: p.clientName,
        stage: p.stage,
        assignedTo: assigneeLabel(p),
      }));
  }, [transactionProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((row) => {
      const bucket = dueDateBucket(row.nextStepDate);
      if (!matchesBucketFilter(bucket, bucketFilter)) return false;
      if (!q) return true;
      return (
        row.nextStep.toLowerCase().includes(q) ||
        row.clientName.toLowerCase().includes(q) ||
        row.propertyAddress.toLowerCase().includes(q) ||
        row.assignedTo.toLowerCase().includes(q)
      );
    });
  }, [allRows, search, bucketFilter]);

  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    for (const row of allRows) {
      const b = dueDateBucket(row.nextStepDate);
      if (b === "overdue") overdue += 1;
      else if (b === "today") today += 1;
      else if (b === "week" || b === "later") upcoming += 1;
    }
    return { overdue, today, upcoming, total: allRows.length };
  }, [allRows]);

  const groups = useMemo(() => {
    const overdue: TaskDashboardRowData[] = [];
    const today: TaskDashboardRowData[] = [];
    const week: TaskDashboardRowData[] = [];
    const later: TaskDashboardRowData[] = [];
    const noDate: TaskDashboardRowData[] = [];
    for (const row of filtered) {
      const b = dueDateBucket(row.nextStepDate);
      if (!row.nextStepDate?.trim()) noDate.push(row);
      else if (b === "overdue") overdue.push(row);
      else if (b === "today") today.push(row);
      else if (b === "week") week.push(row);
      else if (b === "later") later.push(row);
      else noDate.push(row);
    }
    return [
      {
        key: "overdue",
        label: "Overdue",
        icon: AlertTriangle,
        headerClass: "bg-destructive/10 text-destructive",
        rows: overdue,
      },
      {
        key: "today",
        label: "Due today",
        icon: Clock,
        headerClass: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
        rows: today,
      },
      {
        key: "week",
        label: "This week",
        icon: CalendarDays,
        headerClass: "bg-secondary/80 text-foreground",
        rows: week,
      },
      {
        key: "later",
        label: "Later",
        icon: CalendarDays,
        headerClass: "bg-muted/50 text-muted-foreground",
        rows: later,
      },
      {
        key: "no-date",
        label: "No date",
        icon: CalendarDays,
        headerClass: "bg-muted/30 text-muted-foreground",
        rows: noDate,
      },
    ];
  }, [filtered]);

  const visibleGroups = groups.filter((g) => g.rows.length > 0);

  const bucketChips: { id: BucketFilter; label: string; count: number; className: string }[] = [
    { id: "all", label: "All", count: counts.total, className: "bg-secondary text-foreground" },
    { id: "overdue", label: "Overdue", count: counts.overdue, className: "bg-destructive/15 text-destructive" },
    { id: "today", label: "Due today", count: counts.today, className: "bg-amber-500/15 text-amber-800 dark:text-amber-200" },
    { id: "upcoming", label: "Upcoming", count: counts.upcoming, className: "bg-muted text-muted-foreground" },
  ];

  return (
    <div className={listPageRootClass}>
      <div className="shrink-0">
        <PageHeader
          title="Next steps"
          subtitle={
            loading
              ? "Loading next steps…"
              : `${filtered.length} transaction${filtered.length === 1 ? "" : "s"} with next steps`
          }
        />
      </div>

      <div className={listPageShellClass}>
        <div className="shrink-0 space-y-3 border-b border-border p-4 sm:p-5">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search next steps, contacts, properties…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search next steps"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {bucketChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setBucketFilter(chip.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  chip.className,
                  bucketFilter === chip.id ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-80 hover:opacity-100",
                )}
              >
                {chip.count} {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className={cn(listPageBodyClass, "p-4 sm:p-5")}>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground">No next steps match</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {allRows.length === 0
                  ? "Set a next step on a transaction to see it here."
                  : "Try clearing filters or adjusting your search."}
              </p>
              {bucketFilter !== "all" || search ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setBucketFilter("all");
                    setSearch("");
                  }}
                >
                  Reset filters
                </Button>
              ) : null}
            </div>
          ) : visibleGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No next steps in this filter.</p>
          ) : (
            <div className="space-y-6">
              {visibleGroups.map((g) => (
                <section key={g.key}>
                  <div
                    className={cn(
                      "mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold",
                      g.headerClass,
                    )}
                  >
                    <g.icon className="h-4 w-4 shrink-0" />
                    {g.label}
                    <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold tabular-nums">
                      {g.rows.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {g.rows.map((row) => (
                      <li key={row.id}>
                        <TaskDashboardRow
                          row={row}
                          project={projectById.get(row.projectId)}
                          client={clients.find((c) => c.id === row.clientId)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
