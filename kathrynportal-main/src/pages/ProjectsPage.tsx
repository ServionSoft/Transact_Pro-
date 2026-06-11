import { useNavigate } from "react-router-dom";
import { Plus, Search, LayoutGrid, List, Columns3, FolderKanban } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIsCompactNav, useIsMobile } from "@/hooks/use-mobile";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import {
  listProjectsFromApi,
  permanentlyDeleteArchivedProjectApi,
  restoreProjectApi,
  type ProjectListItem,
} from "@/api/projects";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { isTransactionProject, type Project } from "@/data/mockData";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import ArchivedTransactionsTable from "@/components/transactions/ArchivedTransactionsTable";
import { listPageBodyClass, listPageRootClass, listPageShellClass } from "@/lib/listPageLayout";
import { cn } from "@/lib/utils";
import { TRANSACTION_STAGES, filterTransactions } from "@/lib/transactionListUtils";
import TransactionCard from "@/components/transactions/TransactionCard";
import TransactionsTable from "@/components/transactions/TransactionsTable";
import TransactionsKanban from "@/components/transactions/TransactionsKanban";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

type ViewMode = "cards" | "list" | "kanban";

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

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("All");
  const isCompactNav = useIsCompactNav();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [loading, setLoading] = useState(() => Boolean(getApiBaseUrl()));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectRows, setProjectRows] = useState<ProjectListItem[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedActionId, setArchivedActionId] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const apiOn = Boolean(getApiBaseUrl());
  const canCreate = !apiOn || hasPermission(user, "projects.create");
  const canDeleteProject = !apiOn || hasPermission(user, "projects.delete");
  const canRestoreProject = !apiOn || hasPermission(user, "projects.edit");
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  const transactionProjects = useMemo(
    () =>
      apiOn ? projectRows : projects.filter(isTransactionProject).map(mapStoreProjectToListItem),
    [apiOn, projectRows, projects],
  );

  const clientEmailById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) {
      if (c.email?.trim()) m.set(c.id, c.email.trim());
    }
    return m;
  }, [clients]);

  const refresh = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listProjectsFromApi({ archived: showArchived });
      setProjectRows(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load transactions.";
      setLoadError(msg);
      setProjectRows([]);
      toast.error(showArchived ? "Could not load archived transactions" : "Could not load transactions", {
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  }, [apiOn, showArchived]);

  const handleRestoreArchived = async (projectId: string) => {
    if (
      !(await confirm({
        title: "Restore transaction",
        description: "Restore this transaction to the active list?",
        confirmLabel: "Restore",
        destructive: false,
      }))
    ) {
      return;
    }
    setArchivedActionId(projectId);
    try {
      await restoreProjectApi(projectId);
      toast.success("Transaction restored.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not restore transaction.");
    } finally {
      setArchivedActionId(null);
    }
  };

  const handlePurgeArchived = async (projectId: string, label: string) => {
    if (
      !(await confirm({
        title: "Remove archived transaction",
        description: `Permanently remove archived transaction "${label}"? This cannot be undone.`,
        confirmLabel: "Remove permanently",
      }))
    ) {
      return;
    }
    setArchivedActionId(projectId);
    try {
      await permanentlyDeleteArchivedProjectApi(projectId);
      toast.success("Archived transaction removed.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove archived transaction.");
    } finally {
      setArchivedActionId(null);
    }
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(
    () => filterTransactions(transactionProjects, search, viewMode === "kanban" ? "All" : filterStage),
    [transactionProjects, search, filterStage, viewMode],
  );

  const showStageTabs = viewMode !== "kanban" && !showArchived;

  useEffect(() => {
    if (showArchived && viewMode === "kanban") {
      setViewMode("list");
    }
  }, [showArchived, viewMode]);

  useEffect(() => {
    if (isCompactNav && viewMode === "list") {
      setViewMode("cards");
    }
  }, [isCompactNav, viewMode]);

  useEffect(() => {
    if (isMobile && viewMode === "kanban") {
      setViewMode("cards");
    }
  }, [isMobile, viewMode]);

  const viewButtons: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: "cards", icon: LayoutGrid, label: "Cards" },
    { mode: "list", icon: List, label: "List" },
    { mode: "kanban", icon: Columns3, label: "Kanban" },
  ];

  return (
    <div className={listPageRootClass}>
      <div className="shrink-0">
        <PageHeader
          title="Transactions"
          subtitle={
            loading
              ? "Loading…"
              : showArchived
                ? `${transactionProjects.length} archived`
                : `${transactionProjects.length} active`
          }
          actions={
            canCreate && !showArchived ? (
              <Button onClick={() => navigate("/projects/new")} className="gap-2">
                <Plus className="h-4 w-4" /> New transaction
              </Button>
            ) : undefined
          }
        />
      </div>

      <div className={listPageShellClass}>
        <div className="shrink-0 border-b border-border">
          <div className="flex flex-col gap-3 p-4 sm:gap-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search property, contact, address…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Search transactions"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                {apiOn ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="transactions-archived"
                      checked={showArchived}
                      onCheckedChange={(checked) => {
                        setShowArchived(Boolean(checked));
                        if (checked) setFilterStage("All");
                      }}
                    />
                    <Label
                      htmlFor="transactions-archived"
                      className="cursor-pointer text-sm font-normal text-muted-foreground"
                    >
                      Show archived
                    </Label>
                  </div>
                ) : null}
                {!showArchived ? (
                  <div className="flex items-center gap-1" role="tablist" aria-label="View mode">
                    {viewButtons
                      .filter((v) => !(isCompactNav && v.mode === "list"))
                      .filter((v) => !(isMobile && v.mode === "kanban"))
                      .map((v) => {
                      const active = viewMode === v.mode;
                      return (
                        <button
                          key={v.mode}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setViewMode(v.mode)}
                          className={cn(
                            "inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-sm",
                            active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <v.icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {showArchived && apiOn ? (
              <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                Archived transactions were removed from the active list. Use <strong className="text-foreground">Restore</strong> to
                bring one back, or <strong className="text-foreground">Remove permanently</strong> to delete the record (required
                before permanently deleting a contact).
              </p>
            ) : null}

            {showStageTabs ? (
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
            ) : (
              <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                Kanban shows all stages — use search to narrow results.
              </p>
            )}
          </div>

          {loadError && (
            <div className="border-t border-destructive/30 bg-destructive/5 px-4 py-4 sm:px-5">
              <p className="text-sm font-medium text-destructive">Could not load transactions from API.</p>
              <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          )}
        </div>

        <div className={cn(listPageBodyClass, "p-4 sm:p-5")}>
          {loading ? (
            <>
              {viewMode === "cards" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-52 w-full rounded-xl" />
                  ))}
                </div>
              )}
              {viewMode === "list" && (
                <TransactionsTable rows={[]} clientEmailById={clientEmailById} loading />
              )}
              {viewMode === "kanban" && <TransactionsKanban rows={[]} search={search} loading />}
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <FolderKanban className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">
                {showArchived ? "No archived transactions" : "No transactions match"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {showArchived
                  ? "Switch off “Show archived” to return to active transactions."
                  : "Adjust search or stage filters, or create a new transaction."}
              </p>
              {canCreate && !showArchived ? (
                <Button className="mt-6 gap-2" onClick={() => navigate("/projects/new")}>
                  <Plus className="h-4 w-4" /> New transaction
                </Button>
              ) : null}
            </div>
          ) : showArchived && apiOn ? (
            <ArchivedTransactionsTable
              rows={filtered}
              busyId={archivedActionId}
              canRestore={canRestoreProject}
              canPurge={canDeleteProject}
              onRestore={(id) => void handleRestoreArchived(id)}
              onPurge={(id, label) => void handlePurgeArchived(id, label)}
            />
          ) : (
            <>
              {viewMode === "cards" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.24) }}
                    >
                      <TransactionCard
                        project={project}
                        clientEmail={clientEmailById.get(project.clientId)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
              {viewMode === "list" && (
                <TransactionsTable rows={filtered} clientEmailById={clientEmailById} />
              )}
              {viewMode === "kanban" && (
                <TransactionsKanban rows={transactionProjects} search={search} />
              )}
            </>
          )}
        </div>
      </div>
      <ConfirmDialogHost />
    </div>
  );
}
