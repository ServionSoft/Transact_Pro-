import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, Mail, Upload, Edit3, Search, AlertTriangle, Clock, CalendarDays } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { isTransactionProject } from "@/data/mockData";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface FlatTask {
  id: string;
  title: string;
  dueDate: string;
  projectId: string;
  propertyAddress: string;
  clientName: string;
  stage: string;
  status: string;
  assignedTo: string;
}

const TODAY = new Date("2026-02-24");

function bucket(dateStr: string): "overdue" | "today" | "week" | "later" {
  const d = new Date(dateStr);
  const diffDays = Math.floor((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 7) return "week";
  return "later";
}

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const projects = useAppStore(s => s.projects);
  const setTaskStatus = useAppStore(s => s.setTaskStatus);
  const transactionProjects = useMemo(() => projects.filter(isTransactionProject), [projects]);

  const allTasks = useMemo<FlatTask[]>(() => {
    return transactionProjects.flatMap(p =>
      p.tasks
        .filter(t => t.status !== "Complete")
        .map(t => ({
          id: `${p.id}::${t.id}`,
          title: t.title,
          dueDate: t.dueDate,
          projectId: p.id,
          propertyAddress: p.propertyAddress,
          clientName: p.clientName,
          stage: t.stage,
          status: t.status,
          assignedTo: "Kathryn Santos",
        }))
    );
  }, [transactionProjects]);

  const filtered = allTasks.filter(t => {
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.clientName.toLowerCase().includes(q) ||
      t.propertyAddress.toLowerCase().includes(q)
    );
  });

  const overdue = filtered.filter(t => bucket(t.dueDate) === "overdue");
  const today = filtered.filter(t => bucket(t.dueDate) === "today");
  const thisWeek = filtered.filter(t => ["week", "later"].includes(bucket(t.dueDate)));

  const markDone = (id: string, title: string) => {
    const [projectId, taskId] = id.split("::");
    setTaskStatus(projectId, taskId, "Complete");
    toast.success(`Marked "${title}" complete`);
  };

  const groups = [
    {
      key: "overdue",
      label: "Overdue",
      icon: AlertTriangle,
      headerClass: "bg-destructive/10 text-destructive border-destructive/30",
      badgeClass: "bg-destructive text-destructive-foreground",
      tasks: overdue,
    },
    {
      key: "today",
      label: "Due Today",
      icon: Clock,
      headerClass: "bg-accent/15 text-accent-foreground border-accent/30",
      badgeClass: "bg-accent text-accent-foreground",
      tasks: today,
    },
    {
      key: "week",
      label: "This Week & Upcoming",
      icon: CalendarDays,
      headerClass: "bg-secondary text-foreground border-border",
      badgeClass: "bg-muted text-muted-foreground",
      tasks: thisWeek,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Task Dashboard"
        subtitle={`${filtered.length} open tasks across all transactions`}
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks, contacts, properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive font-semibold">
            {overdue.length} Overdue
          </span>
          <span className="px-3 py-1.5 rounded-full bg-accent/15 text-accent-foreground font-semibold">
            {today.length} Due Today
          </span>
          <span className="px-3 py-1.5 rounded-full bg-secondary text-foreground font-semibold">
            {thisWeek.length} Upcoming
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map(g => (
          <div key={g.key} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className={`flex items-center justify-between px-5 py-3 border-b ${g.headerClass}`}>
              <div className="flex items-center gap-2">
                <g.icon className="w-4 h-4" />
                <h2 className="font-display font-semibold text-sm">{g.label}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.badgeClass}`}>
                  {g.tasks.length}
                </span>
              </div>
            </div>
            {g.tasks.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-muted-foreground">
                No tasks in this group.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {g.tasks.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors"
                  >
                    <button
                      onClick={() => markDone(t.id, t.title)}
                      className="w-5 h-5 rounded border-2 border-border hover:border-accent flex items-center justify-center shrink-0"
                      aria-label="Mark done"
                    >
                      <CheckSquare className="w-3 h-3 opacity-0 hover:opacity-50" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/projects/${t.projectId}`}
                        className="text-sm font-medium text-foreground hover:text-accent truncate block"
                      >
                        {t.title}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.propertyAddress.split(",")[0]} • {t.clientName} • {t.stage}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap ${
                        g.key === "overdue"
                          ? "bg-destructive/15 text-destructive"
                          : g.key === "today"
                          ? "bg-accent/15 text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.dueDate}
                    </span>
                    <span className="text-[10px] text-muted-foreground hidden md:inline whitespace-nowrap">
                      {t.assignedTo}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => markDone(t.id, t.title)} title="Mark done">
                        <CheckSquare className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toast.info("Edit task")} title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Link to={`/email?to=${t.clientName}`}>
                        <Button size="sm" variant="ghost" className="h-7 px-2" title="Email">
                          <Mail className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toast.success("File uploaded")} title="Upload">
                        <Upload className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
