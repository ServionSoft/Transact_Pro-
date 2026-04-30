import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, LayoutGrid, List, Columns3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { listProjectsFromApi, type ProjectListItem } from "@/api/projects";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTransactionProject, type ProjectStage } from "@/data/mockData";
import { motion } from "framer-motion";
import { toast } from "sonner";

const stages: (ProjectStage | "All")[] = ["All", "Listing Prep", "Listing Complete", "In Escrow", "Ready to Close", "Closed"];
const kanbanStages: ProjectStage[] = ["Listing Prep", "Listing Complete", "In Escrow", "Ready to Close", "Closed"];

type ViewMode = "cards" | "list" | "kanban";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectRows, setProjectRows] = useState<ProjectListItem[]>([]);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const projects = useAppStore((s) => s.projects);
  const apiOn = Boolean(getApiBaseUrl());
  const canCreate = !apiOn || hasPermission(user, "projects.create");
  const transactionProjects = apiOn
    ? projectRows
    : projects.filter(isTransactionProject).map((p) => ({
        id: p.id,
        name: p.name,
        clientId: p.clientId,
        clientName: p.clientName,
        propertyAddress: p.propertyAddress,
        type: p.type === "Buyer Representation" ? "Buyer File" : p.type,
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
        documentsCompleteCount: p.documents.filter((d) => d.status === "Complete").length,
        documentsTotalCount: p.documents.length,
        tasksCompleteCount: p.tasks.filter((t) => t.status === "Complete").length,
        tasksTotalCount: p.tasks.length,
        deadlinesCount: p.deadlines.length,
        filesCount: p.attachments.length,
      }));

  const refresh = useCallback(async () => {
    if (!getApiBaseUrl()) return;
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listProjectsFromApi();
      setProjectRows(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load projects.";
      setLoadError(msg);
      setProjectRows([]);
      toast.error("Could not load projects", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = transactionProjects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.propertyAddress.toLowerCase().includes(search.toLowerCase());
    const matchStage = filterStage === "All" || p.stage === filterStage;
    return matchSearch && matchStage;
  });

  const viewButtons: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: "cards", icon: LayoutGrid, label: "Cards" },
    { mode: "list", icon: List, label: "List" },
    { mode: "kanban", icon: Columns3, label: "Kanban" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Projects"
        subtitle={loading ? "Loading..." : `${transactionProjects.length} total transactions`}
        actions={
          canCreate ? (
            <Button onClick={() => navigate("/projects/new")} className="gap-2">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          ) : undefined
        }
      />

      {loadError && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">Could not load projects from API.</p>
          <p className="text-xs mt-1 text-muted-foreground">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap flex-1">
          {viewMode !== "kanban" && stages.map(s => (
            <button
              key={s}
              onClick={() => setFilterStage(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStage === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {viewButtons.map(v => (
            <button
              key={v.mode}
              onClick={() => setViewMode(v.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === v.mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <v.icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards View */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/projects/${project.id}`} className="block bg-card border border-border rounded-lg p-5 hover:border-accent/50 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{project.propertyAddress.split(",")[0]}</p>
                    <p className="text-xs text-muted-foreground">{project.clientName} • {project.type}</p>
                  </div>
                  <StatusBadge status={project.stage} type="stage" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">List Price</span>
                    <span className="text-foreground font-medium">{project.listPrice}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Documents</span>
                    <span className="text-foreground font-medium">
                      {project.documentsCompleteCount}/{project.documentsTotalCount} complete
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Next Step</span>
                    <span className="text-foreground font-medium truncate max-w-[60%] text-right">{project.nextStepDate}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground truncate">{project.nextStep}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Stage</th>
                  <th className="px-5 py-3 font-medium">List Price</th>
                  <th className="px-5 py-3 font-medium">Docs</th>
                  <th className="px-5 py-3 font-medium">Next Step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((project, i) => (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-foreground">{project.propertyAddress.split(",")[0]}</p>
                      <p className="text-xs text-muted-foreground">{project.propertyAddress.split(",").slice(1).join(",").trim()}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground">{project.clientName}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{project.type}</td>
                    <td className="px-5 py-4"><StatusBadge status={project.stage} type="stage" /></td>
                    <td className="px-5 py-4 text-sm font-medium text-foreground">{project.listPrice}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-muted-foreground">
                        {project.documentsCompleteCount}/{project.documentsTotalCount}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{project.nextStep}</p>
                      <p className="text-xs text-muted-foreground/60">{project.nextStepDate}</p>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Kanban View — all stages always visible */}
      {viewMode === "kanban" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 overflow-x-auto pb-4">
          {kanbanStages.map(stage => {
            const stageProjects = transactionProjects.filter(p => {
              const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.clientName.toLowerCase().includes(search.toLowerCase()) ||
                p.propertyAddress.toLowerCase().includes(search.toLowerCase());
              return matchSearch && p.stage === stage;
            });
            const stageColors: Record<string, string> = {
              "Listing Prep": "bg-blue-500/15 text-blue-400 border-blue-500/30",
              "Listing Complete": "bg-primary/15 text-primary border-primary/30",
              "In Escrow": "bg-purple-500/15 text-purple-400 border-purple-500/30",
              "Ready to Close": "bg-orange-500/15 text-orange-400 border-orange-500/30",
              "Closed": "bg-success/15 text-success border-success/30",
            };
            // Listings-only stages — buyer files never enter these
            const listingOnly = stage === "Listing Prep" || stage === "Listing Complete";
            return (
              <div key={stage} className="flex-shrink-0 w-[280px]">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${stageColors[stage] || "bg-muted text-muted-foreground"}`}>
                    {stage}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{stageProjects.length}</span>
                  {listingOnly && (
                    <span className="ml-auto text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Listings only
                    </span>
                  )}
                </div>
                <div className="space-y-3 min-h-[200px] bg-secondary/20 rounded-lg p-2">
                  {stageProjects.map((project, i) => {
                    const isBuyer = project.type === "Buyer Representation" || project.type === "Buyer File";
                    const naForBuyer = isBuyer && listingOnly;
                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link
                          to={`/projects/${project.id}`}
                          className={`block bg-card border border-border rounded-lg p-3 hover:border-accent/50 hover:shadow-md transition-all ${naForBuyer ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground truncate flex-1">
                              {project.propertyAddress.split(",")[0]}
                            </p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                              isBuyer ? "bg-info/15 text-info" : "bg-accent/15 text-accent-foreground"
                            }`}>
                              {isBuyer ? "Buyer" : "Listing"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 truncate">{project.clientName}</p>
                          {naForBuyer && (
                            <p className="text-[10px] italic text-muted-foreground mb-1">N/A for buyer files</p>
                          )}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                            <span className="text-muted-foreground">Next: {project.nextStepDate}</span>
                            <span className="font-medium text-foreground">{project.listPrice}</span>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                  {stageProjects.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      {listingOnly ? "Listings only" : "No projects"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {viewMode !== "kanban" && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No projects found.</div>
      )}
    </div>
  );
}
