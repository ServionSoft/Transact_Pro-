import { Link } from "react-router-dom";
import {
  ArrowRight,
  AlertTriangle,
  FolderKanban,
  Users,
  Calendar as CalendarIcon,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, endOfWeek, isWithinInterval, parseISO, startOfDay, startOfWeek } from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { isTransactionProject, projectTypeLabel, type Project, type ProjectStage, type CalendarEvent } from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { hasPermission } from "@/lib/permissions";
import { listProjectsFromApi, listCalendarEventsApi, type ProjectListItem, type CalendarEventApi } from "@/api/projects";
import { listClientsFromApi } from "@/api/clients";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STAGE_CHART_ORDER: ProjectStage[] = ["Listing Prep", "Listing Complete", "In Escrow", "Ready to Close", "Closed"];
const PIE_COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#14b8a6", "#94a3b8"];

type TxLite = {
  id: string;
  clientName: string;
  propertyAddress: string;
  stage: ProjectStage;
  nextStep: string;
  nextStepDate: string;
  openTasks: number;
};

function mapCalendarApiRow(e: CalendarEventApi): CalendarEvent {
  return {
    id: e.id,
    sourceId: e.sourceId,
    title: e.title,
    date: e.date,
    projectId: e.projectId,
    projectName: e.projectName,
    type: e.kind,
    propertyAddress: e.propertyAddress,
    clientName: e.clientName,
    clientEmail: e.clientEmail,
    source: e.source,
    isOverdue: e.isOverdue,
  };
}

function mapListItemToProject(row: ProjectListItem): Project {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId,
    clientName: row.clientName,
    propertyAddress: row.propertyAddress,
    type: row.type === "Buyer File" ? "Buyer File" : "Listing",
    stage: row.stage,
    nextStep: row.nextStep ?? "",
    nextStepDate: row.nextStepDate ?? "",
    yearBuilt: row.yearBuilt ?? "",
    propertyType: row.propertyType ?? "",
    representationSide: row.representationSide ?? "",
    escrowOfficer: row.escrowOfficer ?? "",
    escrowCompany: row.escrowCompany ?? "",
    listPrice: row.listPrice ?? "—",
    createdAt: row.createdAt,
    documents: [],
    tasks: [],
    emails: [],
    notes: [],
    deadlines: [],
    attachments: [],
    fileFolders: [],
  };
}

function safeParseDay(value: string): Date | null {
  const t = value?.trim();
  if (!t) return null;
  const iso = parseISO(t);
  if (!Number.isNaN(iso.getTime())) return startOfDay(iso);
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return startOfDay(d);
  return null;
}

function projectToLite(p: Project): TxLite {
  const openTasks = p.tasks.filter((t) => t.status !== "Complete").length;
  return {
    id: p.id,
    clientName: p.clientName,
    propertyAddress: p.propertyAddress,
    stage: p.stage,
    nextStep: p.nextStep,
    nextStepDate: p.nextStepDate,
    openTasks,
  };
}

function listItemToLite(row: ProjectListItem): TxLite {
  const open = Math.max(0, (row.tasksTotalCount ?? 0) - (row.tasksCompleteCount ?? 0));
  return {
    id: row.id,
    clientName: row.clientName,
    propertyAddress: row.propertyAddress,
    stage: row.stage,
    nextStep: row.nextStep ?? "",
    nextStepDate: row.nextStepDate ?? "",
    openTasks: open,
  };
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const projects = useAppStore((s) => s.projects);
  const clients = useAppStore((s) => s.clients);
  const calendarEvents = useAppStore((s) => s.calendarEvents);
  const setProjects = useAppStore((s) => s.setProjects);
  const setClients = useAppStore((s) => s.setClients);

  const canViewProjects = hasPermission(user, "projects.view");
  const canViewClients = hasPermission(user, "clients.view");

  const apiOn = Boolean(getApiBaseUrl());
  const [liveRows, setLiveRows] = useState<ProjectListItem[] | null>(null);
  const [liveCalendar, setLiveCalendar] = useState<CalendarEvent[] | null>(null);
  const [liveActiveClients, setLiveActiveClients] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!apiOn) {
      setLiveRows(null);
      setLiveCalendar(null);
      setLiveActiveClients(null);
      setLastSynced(new Date());
      return;
    }
    setLoading(true);
    try {
      const from = addDays(startOfDay(new Date()), -7).toISOString().slice(0, 10);
      const to = addDays(startOfDay(new Date()), 60).toISOString().slice(0, 10);
      const [rows, events, clientRows] = await Promise.all([
        canViewProjects ? listProjectsFromApi() : Promise.resolve([] as ProjectListItem[]),
        listCalendarEventsApi({
          from,
          to,
          kinds: ["deadline", "reminder", "task", "meeting", "close"],
        }),
        canViewClients ? listClientsFromApi({ archived: false }) : Promise.resolve(null),
      ]);
      setLiveRows(canViewProjects ? rows : []);
      setLiveCalendar(events.map(mapCalendarApiRow));
      if (canViewClients && clientRows) {
        setLiveActiveClients(clientRows.filter((c) => c.status === "Active").length);
        setClients(clientRows);
      } else {
        setLiveActiveClients(null);
      }
      if (canViewProjects) {
        setProjects(rows.map(mapListItemToProject));
      }
      setLastSynced(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refresh failed.";
      toast.error("Dashboard could not refresh", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [apiOn, canViewClients, canViewProjects, setClients, setProjects]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && apiOn) void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [apiOn, refresh]);

  const txLites = useMemo<TxLite[]>(() => {
    if (!canViewProjects) return [];
    if (apiOn) {
      if (!liveRows) return [];
      return liveRows.map(listItemToLite);
    }
    return projects.filter(isTransactionProject).map(projectToLite);
  }, [apiOn, canViewProjects, liveRows, projects]);

  const events = useMemo(() => {
    if (apiOn && liveCalendar) return liveCalendar;
    return calendarEvents;
  }, [apiOn, liveCalendar, calendarEvents]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

  const stats = useMemo(() => {
    const activeTx = txLites.filter((t) => t.stage !== "Closed").length;
    const activeClientsCount =
      apiOn && liveActiveClients != null ? liveActiveClients : clients.filter((c) => c.status === "Active").length;
    const upcomingDeadlines = events.filter((e) => e.type === "deadline").length;
    const dueThisWeek = txLites.filter((t) => {
      if (t.stage === "Closed") return false;
      const d = safeParseDay(t.nextStepDate);
      if (!d) return false;
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }).length;

    const openTasksTotal = txLites.filter((t) => t.stage !== "Closed").reduce((sum, t) => sum + t.openTasks, 0);

    return {
      activeTx,
      activeClientsCount,
      upcomingDeadlines,
      dueThisWeek,
      openTasksTotal,
    };
  }, [txLites, events, clients, apiOn, liveActiveClients, weekStart, weekEnd]);

  const stageChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STAGE_CHART_ORDER) counts[s] = 0;
    for (const t of txLites) {
      if (counts[t.stage] !== undefined) counts[t.stage] += 1;
    }
    return STAGE_CHART_ORDER.filter((s) => counts[s] > 0).map((name) => ({ name, value: counts[name] }));
  }, [txLites]);

  const deadlineBarData = useMemo(() => {
    const today = startOfDay(new Date());
    const days: { day: string; n: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), n: 0 });
    }
    for (const e of events) {
      if (e.type !== "deadline") continue;
      const d = safeParseDay(e.date);
      if (!d) continue;
      const diff = Math.floor((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (diff >= 0 && diff < 14) days[diff].n += 1;
    }
    return days;
  }, [events]);

  const attentionItems = useMemo(() => {
    type Item = { key: string; title: string; sub: string; href: string; urgent: boolean };
    const out: Item[] = [];
    const soon = addDays(startOfDay(new Date()), 7);
    if (canViewProjects) {
      for (const t of txLites) {
        if (t.stage === "Closed" || !t.nextStep?.trim()) continue;
        const d = safeParseDay(t.nextStepDate);
        const urgent = d != null && d < startOfDay(new Date());
        const soonish = d != null && d <= soon;
        if (urgent || soonish || !d) {
          out.push({
            key: `ns-${t.id}`,
            title: t.nextStep,
            sub: `${t.clientName} · ${t.propertyAddress.split(",")[0] ?? t.propertyAddress}`,
            href: `/projects/${t.id}`,
            urgent,
          });
        }
      }
    }
    for (const e of events) {
      if (e.type !== "deadline") continue;
      const d = safeParseDay(e.date);
      if (!d || d > soon) continue;
      const pid = e.projectId?.trim() ?? "";
      const href = canViewProjects && pid ? `/projects/${pid}` : "/calendar";
      out.push({
        key: `dl-${e.id}`,
        title: e.title,
        sub: e.propertyAddress,
        href,
        urgent: Boolean(e.isOverdue) || d < startOfDay(new Date()),
      });
    }
    out.sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1));
    return out.slice(0, 6);
  }, [txLites, events, canViewProjects]);

  const upcomingDeadlineSlice = useMemo(() => {
    return events
      .filter((e) => e.type === "deadline")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [events]);

  const tableRows = useMemo(() => {
    return txLites
      .filter((t) => t.stage !== "Closed")
      .slice(0, 10)
      .map((t) => ({
        ...t,
        typeLabel: apiOn && liveRows ? (liveRows.find((r) => r.id === t.id)?.type === "Buyer File" ? "Buyer File" : "Listing") : undefined,
      }));
  }, [txLites, apiOn, liveRows]);

  const displayName = user?.name?.trim() || "there";
  const firstName = displayName.split(/\s+/)[0] || displayName;

  const statCards = useMemo(() => {
    const out: { label: string; value: number; icon: typeof FolderKanban }[] = [];
    if (canViewProjects) {
      out.push({ label: "Active transactions", value: stats.activeTx, icon: FolderKanban });
    }
    out.push(
      { label: "Active contacts", value: stats.activeClientsCount, icon: Users },
      { label: "Calendar deadlines", value: stats.upcomingDeadlines, icon: CalendarIcon },
    );
    if (canViewProjects) {
      out.push(
        { label: "Next steps this week", value: stats.dueThisWeek, icon: AlertTriangle },
        { label: "Open tasks", value: stats.openTasksTotal, icon: ListTodo },
      );
    }
    return out;
  }, [canViewProjects, stats.activeTx, stats.activeClientsCount, stats.dueThisWeek, stats.openTasksTotal, stats.upcomingDeadlines]);

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6 max-w-[1600px] mx-auto h-[calc(100dvh-4.5rem)] min-h-[520px] max-h-[920px]">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 shrink-0">
        <PageHeader
          title={`Good morning, ${firstName}`}
          subtitle="Live snapshot — refresh or revisit this page to update."
          className="mb-0"
        />
        <div className="flex items-center gap-2 shrink-0">
          {lastSynced && (
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              Updated {lastSynced.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={loading} onClick={() => void refresh()}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-2 shrink-0",
          statCards.length <= 2 ? "grid-cols-2 max-w-xl" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        )}
      >
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-lg border border-border/80 bg-card/80 backdrop-blur-sm px-3 py-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-medium text-muted-foreground leading-tight">{card.label}</span>
              <card.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
            <p className="text-xl font-semibold tabular-nums tracking-tight">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        <div className="lg:col-span-5 flex flex-col gap-2 min-h-0">
          <div className="rounded-lg border border-border/80 bg-card/60 p-2 flex-1 min-h-[140px] flex flex-col">
            <p className="text-[11px] font-semibold text-muted-foreground px-1 mb-1">Pipeline by stage</p>
            <div className="flex-1 min-h-[120px]">
              {!canViewProjects ? (
                <p className="text-xs text-muted-foreground p-2">Transaction pipeline is not available for your role.</p>
              ) : stageChartData.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No transactions to chart.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minHeight={140}>
                  <PieChart>
                    <Pie
                      data={stageChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={52}
                      paddingAngle={2}
                    >
                      {stageChartData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [`${v}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border/80 bg-card/60 p-2 flex-1 min-h-[120px] flex flex-col">
            <p className="text-[11px] font-semibold text-muted-foreground px-1 mb-1">Deadlines · next 14 days</p>
            <div className="flex-1 min-h-[100px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={110}>
                <BarChart data={deadlineBarData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={2} />
                  <YAxis allowDecimals={false} width={22} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="n" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col min-h-0 rounded-lg border border-border/80 bg-card/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/80 flex items-center justify-between shrink-0">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attention</h2>
            {canViewProjects ? (
              <Link to="/projects" className="text-[11px] text-accent hover:underline flex items-center gap-0.5">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <span className="text-[11px] text-muted-foreground">Calendar and deadlines</span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            {attentionItems.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">Nothing urgent in the next week.</p>
            ) : (
              attentionItems.map((item, i) => (
                <motion.div key={item.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <Link
                    to={item.href}
                    className={`block px-3 py-2 border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors ${item.urgent ? "border-l-2 border-l-destructive" : ""}`}
                  >
                    <p className="text-xs font-medium text-foreground line-clamp-2">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.sub}</p>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col min-h-0 rounded-lg border border-border/80 bg-card/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/80 flex items-center justify-between shrink-0">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deadlines</h2>
            <Link to="/calendar" className="text-[11px] text-accent hover:underline flex items-center gap-0.5">
              Cal <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            {upcomingDeadlineSlice.length === 0 ? (
              <p className="text-xs text-muted-foreground p-3">No deadline events in the loaded date range.</p>
            ) : (
              upcomingDeadlineSlice.map((event, i) => {
                const pid = event.projectId?.trim() ?? "";
                const projectHref = canViewProjects && pid ? `/projects/${pid}` : null;
                const inner = (
                  <>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                      <p className="text-xs font-medium line-clamp-2">{event.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{event.propertyAddress}</p>
                    <p className="text-[10px] text-accent font-medium mt-0.5">{event.date}</p>
                  </>
                );
                return (
                  <motion.div key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <Link
                      to={projectHref ?? "/calendar"}
                      className="block px-3 py-2 border-b border-border/40 last:border-0 hover:bg-secondary/40"
                    >
                      {inner}
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-card/60 flex flex-col flex-1 min-h-[140px] max-h-[220px] shrink-0 overflow-hidden">
        <div className="px-3 py-2 border-b border-border/80 flex items-center justify-between shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active transactions</h2>
          {canViewProjects ? (
            <Link to="/projects" className="text-[11px] text-accent hover:underline flex items-center gap-0.5">
              Open list <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <span className="text-[11px] text-muted-foreground">Restricted</span>
          )}
        </div>
        <div className="overflow-auto flex-1 min-h-0">
          {!canViewProjects ? (
            <p className="text-xs text-muted-foreground px-3 py-6 text-center">You do not have permission to view transactions. Use Calendar for dates that apply to you.</p>
          ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/60 bg-muted/20">
                <th className="px-2 py-1.5 font-medium">Property</th>
                <th className="px-2 py-1.5 font-medium hidden sm:table-cell">Contact</th>
                <th className="px-2 py-1.5 font-medium">Type</th>
                <th className="px-2 py-1.5 font-medium">Stage</th>
                <th className="px-2 py-1.5 font-medium hidden md:table-cell">Next</th>
                <th className="px-2 py-1.5 font-medium w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-muted-foreground text-center">
                    {apiOn && liveRows === null && loading ? "Loading…" : "No active transactions."}
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => {
                  const typeLabel =
                    row.typeLabel ??
                    (() => {
                      const p = projects.find((x) => x.id === row.id);
                      return p ? projectTypeLabel(p.type) : "—";
                    })();
                  return (
                    <tr key={row.id} className="hover:bg-secondary/30">
                      <td className="px-2 py-1.5">
                        <Link to={`/projects/${row.id}`} className="font-medium text-foreground hover:text-accent line-clamp-1">
                          {row.propertyAddress.split(",")[0]}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell line-clamp-1">{row.clientName}</td>
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{typeLabel}</td>
                      <td className="px-2 py-1.5">
                        <StatusBadge status={row.stage} type="stage" />
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground max-w-[140px] truncate hidden md:table-cell">{row.nextStep}</td>
                      <td className="px-2 py-1.5">
                        <Link to={`/projects/${row.id}`} className="text-accent hover:underline">
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}
