import { useCallback, useEffect, useMemo, useState } from "react";
import { ListTodo, Search } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { isTransactionProject, type Project } from "@/data/mockData";
import { getProjectFromApi, listProjectsFromApi, type ProjectListItem } from "@/api/projects";
import { getApiBaseUrl } from "@/lib/apiConfig";
import PageHeader from "@/components/shared/PageHeader";
import NextStepsTable, { type NextStepTableRow } from "@/components/next-steps/NextStepsTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPageBodyClass, listPageRootClass, listPageShellClass } from "@/lib/listPageLayout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TRANSACTION_STAGES, dueDateBucket } from "@/lib/transactionListUtils";
import {
  projectCloseOfEscrowDate,
  projectLatestNotePreview,
  projectTransactionAgentLabel,
} from "@/lib/nextStepDisplayUtils";

function hasNextStepItem(p: Pick<ProjectListItem, "nextStep" | "nextStepDate">): boolean {
  return Boolean(p.nextStep?.trim() || p.nextStepDate?.trim());
}

function mapStoreProjectToListItem(p: Project): ProjectListItem {
  return {
    id: p.id,
    name: p.name,
    clientId: p.clientId,
    clientName: p.clientName,
    propertyAddress: p.propertyAddress,
    type: p.type === "Buyer Representation" ? "Buyer File" : "Listing",
    stage: p.stage,
    nextStep: p.nextStep,
    nextStepDate: p.nextStepDate,
    yearBuilt: p.yearBuilt,
    propertyType: p.propertyType,
    representationSide: p.representationSide,
    escrowOfficer: p.escrowOfficer,
    escrowCompany: p.escrowCompany,
    listPrice: p.listPrice,
    createdAt: p.createdAt,
    documentsCompleteCount: p.documents.filter((d) => d.status === "Complete" || d.status === "Completed").length,
    documentsTotalCount: p.documents.length,
    tasksCompleteCount: p.tasks.filter((t) => t.status === "Complete").length,
    tasksTotalCount: p.tasks.length,
    deadlinesCount: p.deadlines.length,
    filesCount: p.attachments.length,
  };
}

function buildNextStepRow(listItem: ProjectListItem, full?: Project | null): NextStepTableRow {
  return {
    ...listItem,
    agentName: full ? projectTransactionAgentLabel(full) : "—",
    coeDate: full ? projectCloseOfEscrowDate(full) || "—" : "—",
    notesPreview: full ? projectLatestNotePreview(full) : "",
  };
}

const BUCKET_ORDER: Record<ReturnType<typeof dueDateBucket>, number> = {
  overdue: 0,
  today: 1,
  week: 2,
  later: 3,
  none: 4,
};

function compareNextStepRows(a: NextStepTableRow, b: NextStepTableRow): number {
  const ba = dueDateBucket(a.nextStepDate);
  const bb = dueDateBucket(b.nextStepDate);
  if (BUCKET_ORDER[ba] !== BUCKET_ORDER[bb]) return BUCKET_ORDER[ba] - BUCKET_ORDER[bb];
  const da = a.nextStepDate?.trim() ? new Date(a.nextStepDate).getTime() : Number.POSITIVE_INFINITY;
  const db = b.nextStepDate?.trim() ? new Date(b.nextStepDate).getTime() : Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return a.propertyAddress.localeCompare(b.propertyAddress);
}

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("All");
  const [loading, setLoading] = useState(() => Boolean(getApiBaseUrl()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectRows, setProjectRows] = useState<ProjectListItem[]>([]);
  const storeProjects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const upsertProject = useAppStore((s) => s.upsertProject);
  const apiOn = Boolean(getApiBaseUrl());

  const refresh = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listProjectsFromApi();
      const withNext = rows.filter(
        (p) => (p.type === "Listing" || p.type === "Buyer File") && hasNextStepItem(p),
      );
      setProjectRows(withNext);

      const detailed = await Promise.all(withNext.map((r) => getProjectFromApi(r.id).catch(() => null)));
      detailed.filter((p): p is Project => Boolean(p)).forEach((p) => upsertProject(p));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load next steps.";
      setLoadError(msg);
      setProjectRows([]);
      toast.error("Could not load next steps.", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [apiOn, upsertProject]);

  useEffect(() => {
    if (!apiOn) return;
    void refresh();
  }, [apiOn, refresh]);

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of storeProjects) {
      if (isTransactionProject(p)) map.set(p.id, p);
    }
    return map;
  }, [storeProjects]);

  const allRows = useMemo((): NextStepTableRow[] => {
    const list = apiOn
      ? projectRows
      : storeProjects.filter(isTransactionProject).map(mapStoreProjectToListItem).filter(hasNextStepItem);
    return list
      .map((item) => buildNextStepRow(item, projectById.get(item.id)))
      .sort(compareNextStepRows);
  }, [apiOn, projectRows, storeProjects, projectById]);

  const clientEmailById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) {
      if (c.email?.trim()) m.set(c.id, c.email.trim());
    }
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((row) => {
      const matchStage = filterStage === "All" || row.stage === filterStage;
      const matchSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.clientName.toLowerCase().includes(q) ||
        row.propertyAddress.toLowerCase().includes(q) ||
        row.nextStep.toLowerCase().includes(q) ||
        row.agentName.toLowerCase().includes(q) ||
        row.notesPreview.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q);
      return matchStage && matchSearch;
    });
  }, [allRows, search, filterStage]);

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
        <div className="shrink-0 border-b border-border">
          <div className="flex flex-col gap-2 p-3 sm:gap-3 sm:p-4 lg:p-5">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search property, contact, next step, agent, notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search next steps"
              />
            </div>

            <div
              className="flex items-center gap-1 overflow-x-auto border-t border-border/60 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Filter by stage"
            >
              {TRANSACTION_STAGES.map((s) => {
                const active = filterStage === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilterStage(s)}
                    className={cn(
                      "shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                      active
                        ? "border-primary font-medium text-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {loadError ? (
            <div className="border-t border-destructive/30 bg-destructive/5 px-4 py-4 sm:px-5">
              <p className="text-sm font-medium text-destructive">Could not load next steps from API.</p>
              <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>

        <div className={cn(listPageBodyClass, "overflow-x-hidden p-2 sm:p-3 lg:p-4")}>
          {loading ? (
            <NextStepsTable rows={[]} clientEmailById={clientEmailById} loading />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <ListTodo className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No next steps match</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {allRows.length === 0
                  ? "Set a next step on a transaction to see it here."
                  : "Adjust search or stage filters."}
              </p>
            </div>
          ) : (
            <NextStepsTable rows={filtered} clientEmailById={clientEmailById} />
          )}
        </div>
      </div>
    </div>
  );
}
