import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Mail, Send, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/apiConfig";
import {
  createProjectReminderDraftApi,
  dismissReminderDraftApi,
  listCalendarEventsApi,
  sendReminderDraftApi,
  type CalendarEventApi,
} from "@/api/projects";
import type { CalendarEvent } from "@/data/mockData";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

const eventTypeColors: Record<string, string> = {
  deadline: "bg-destructive/15 text-destructive border-destructive/30",
  reminder: "bg-accent/15 text-accent-foreground border-accent/30",
  task: "bg-info/15 text-info border-info/30",
  meeting: "bg-info/15 text-info border-info/30",
  close: "bg-success/15 text-success border-success/30",
};

const eventDotColors: Record<string, string> = {
  deadline: "bg-destructive",
  reminder: "bg-accent",
  task: "bg-info",
  meeting: "bg-info",
  close: "bg-success",
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<"month" | "list" | "reminders">("month");
  const storeCalendarEvents = useAppStore((s) => s.calendarEvents);
  const apiOn = Boolean(getApiBaseUrl());
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [savingDraftEventId, setSavingDraftEventId] = useState<string | null>(null);
  const [apiEvents, setApiEvents] = useState<CalendarEventApi[]>([]);
  const [activeKinds, setActiveKinds] = useState<Array<CalendarEventApi["kind"]>>(["deadline", "reminder", "meeting", "close", "task"]);

  useEffect(() => {
    if (!apiOn) return;
    let active = true;
    setLoading(true);
    const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const last = `${year}-${String(month + 1).padStart(2, "0")}-${String(getDaysInMonth(year, month)).padStart(2, "0")}`;
    const request =
      view === "reminders"
        ? listCalendarEventsApi({ kinds: ["reminder"] })
        : listCalendarEventsApi({ from: first, to: last, kinds: activeKinds });
    request
      .then((rows) => {
        if (active) setApiEvents(rows);
      })
      .catch((e: unknown) => {
        if (active) {
          toast.error("Could not load calendar events", { description: e instanceof Error ? e.message : "Please try again." });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiOn, year, month, activeKinds, view]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    if (!apiOn) return storeCalendarEvents;
    return apiEvents.map((e) => ({
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
    }));
  }, [apiEvents, apiOn, storeCalendarEvents]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthEvents = calendarEvents.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  }).sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date)));
  const reminderEvents = calendarEvents
    .filter((e) => e.type === "reminder")
    .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date)));

  const refreshEvents = async () => {
    if (!apiOn) return;
    const first = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const last = `${year}-${String(month + 1).padStart(2, "0")}-${String(getDaysInMonth(year, month)).padStart(2, "0")}`;
    const rows =
      view === "reminders"
        ? await listCalendarEventsApi({ kinds: ["reminder"] })
        : await listCalendarEventsApi({ from: first, to: last, kinds: activeKinds });
    setApiEvents(rows);
  };

  const sendReminder = async (sourceId?: string) => {
    if (!apiOn || !sourceId) return;
    try {
      setActingId(sourceId);
      await sendReminderDraftApi(sourceId);
      toast.success("Reminder sent");
      await refreshEvents();
    } catch (e) {
      toast.error("Could not send reminder", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setActingId(null);
    }
  };

  const dismissReminder = async (sourceId?: string) => {
    if (!apiOn || !sourceId) return;
    try {
      setActingId(sourceId);
      await dismissReminderDraftApi(sourceId);
      toast.success("Reminder dismissed");
      await refreshEvents();
    } catch (e) {
      toast.error("Could not dismiss reminder", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setActingId(null);
    }
  };

  const saveDraftFromEvent = async (e: CalendarEvent) => {
    if (!apiOn) return;
    if (!e.clientEmail || !isValidEmail(e.clientEmail)) {
      toast.error("This event has no valid client email.");
      return;
    }
    try {
      setSavingDraftEventId(e.id);
      await createProjectReminderDraftApi(e.projectId, {
        ...(e.source === "project_deadlines" && e.sourceId ? { projectDeadlineId: e.sourceId } : {}),
        reminderType: e.title || "Calendar Reminder",
        to: e.clientEmail,
        subject: `Upcoming Deadline — ${e.title}`,
        body: `Hi ${e.clientName || ""},\n\nThis is a reminder that "${e.title}" for ${e.propertyAddress} is due on ${e.date}.\n\nBest regards,\nKathryn Santos`,
      });
      toast.success("Reminder draft saved.");
      await refreshEvents();
    } catch (err) {
      toast.error("Could not save reminder draft", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSavingDraftEventId(null);
    }
  };

  const kindLabel = (type: CalendarEvent["type"]) => {
    if (type === "close") return "Close of Escrow";
    if (type === "meeting") return "Meeting";
    if (type === "task") return "Task Due";
    if (type === "reminder") return "Reminder";
    return "Deadline";
  };

  const renderEventChip = (e: CalendarEvent, className: string) => (
    <ContextMenu>
      <HoverCard openDelay={120} closeDelay={80}>
        <HoverCardTrigger asChild>
          <ContextMenuTrigger asChild>
            <Link to={`/projects/${e.projectId}`} className={className}>
              {e.title}
            </Link>
          </ContextMenuTrigger>
        </HoverCardTrigger>
        <HoverCardContent className="w-72" align="start">
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-foreground">{e.title}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Type</span>
              <span className="text-foreground">{kindLabel(e.type)}</span>
              <span className="text-muted-foreground">Due</span>
              <span className="text-foreground">{e.date}</span>
              <span className="text-muted-foreground">Client</span>
              <span className="text-foreground">{e.clientName || "Unknown"}</span>
              <span className="text-muted-foreground">Property</span>
              <span className="text-foreground truncate">{e.propertyAddress}</span>
            </div>
            {e.isOverdue ? <p className="text-destructive font-medium">Overdue</p> : null}
          </div>
        </HoverCardContent>
      </HoverCard>
      <ContextMenuContent>
        <ContextMenuItem
          disabled={!apiOn || !e.clientEmail || savingDraftEventId === e.id}
          onSelect={() => void saveDraftFromEvent(e)}
        >
          Save reminder draft
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return monthEvents.filter((e) => e.date === dateStr);
  };
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Calendar" subtitle="Deadlines, reminders, meetings, and closings across all transactions." />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <>
            <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <h2 className="text-lg font-display font-semibold text-foreground min-w-[180px] text-center">
              {months[month]} {year}
            </h2>
            <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </>
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {([
            { v: "month", label: "Month" },
            { v: "list", label: "List" },
            { v: "reminders", label: `Reminders${reminderEvents.length ? ` (${reminderEvents.length})` : ""}` },
          ] as const).map((opt) => (
            <button key={opt.v} onClick={() => setView(opt.v)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === opt.v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2 flex-wrap">
        {[
          ["deadline", "Deadline"],
          ["reminder", "Reminder Draft"],
          ["meeting", "Meeting"],
          ["close", "Close of Escrow"],
          ["task", "Task Due"],
        ].map(([key, label]) => {
          const kind = key as CalendarEventApi["kind"];
          const selected = activeKinds.includes(kind);
          return (
            <Button
              key={kind}
              size="sm"
              variant={selected ? "default" : "outline"}
              className="h-8"
              onClick={() => setActiveKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]))}
            >
              {label}
            </Button>
          );
        })}
      </div>

      {view === "month" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {days.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-border min-h-[100px] bg-muted/30" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const events = getEventsForDay(day);
              const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
              const visible = events.slice(0, 2);
              const overflow = events.length - visible.length;
              return (
                <div key={day} className={`border-b border-r border-border min-h-[100px] p-1.5 ${isToday ? "bg-accent/5" : ""}`}>
                  <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? "bg-accent text-accent-foreground" : "text-foreground"}`}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {visible.map((e) => (
                      <div key={e.id}>
                        {renderEventChip(
                          e,
                          `block text-[10px] px-1.5 py-0.5 rounded border truncate ${eventTypeColors[e.type]} ${e.isOverdue ? "ring-1 ring-destructive/50" : ""}`
                        )}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-[10px] text-accent hover:underline font-semibold">+{overflow} more</button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="start">
                          <p className="text-xs font-semibold mb-2">All events on {months[month]} {day}</p>
                          <div className="space-y-1">
                            {events.map((e) => (
                              <div key={e.id}>
                                {renderEventChip(
                                  e,
                                  `block text-xs px-2 py-1.5 rounded border ${eventTypeColors[e.type]} ${e.isOverdue ? "ring-1 ring-destructive/50" : ""}`
                                )}
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="bg-card border border-border rounded-lg">
          <div className="divide-y divide-border">
            {monthEvents.length > 0 ? monthEvents.map((event, i) => (
              <motion.div key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <Link to={`/projects/${event.projectId}`} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${eventTypeColors[event.type]}`}>{event.type}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.propertyAddress}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${event.isOverdue ? "text-destructive" : "text-accent"}`}>{event.date}</span>
                </Link>
              </motion.div>
            )) : (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">{loading ? "Loading events..." : "No events this month."}</div>
            )}
          </div>
        </div>
      )}

      {view === "reminders" && (
        <div>
          <div className="bg-accent/10 border-l-4 border-accent rounded-lg p-4 mb-6 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{reminderEvents.length} reminder draft{reminderEvents.length !== 1 ? "s" : ""} across all dates</p>
              <p className="text-xs text-muted-foreground">These include reminder timeline items and reminder draft rows.</p>
            </div>
          </div>
          {reminderEvents.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No reminder drafts found yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminderEvents.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border border-l-4 border-l-accent rounded-lg overflow-hidden">
                  <div className="px-5 py-3 border-b border-border bg-secondary/20 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link to={`/projects/${e.projectId}`} className="text-sm font-semibold text-foreground hover:text-accent">{e.projectName}</Link>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{e.clientName || "Unknown client"}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-destructive/10 text-destructive">Reminder Draft</span>
                      <span className={`text-xs font-medium ${e.isOverdue ? "text-destructive" : "text-accent"}`}>Due {e.date}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{e.propertyAddress}</p>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!apiOn || !e.sourceId || actingId === e.sourceId}
                        onClick={() => dismissReminder(e.sourceId)}
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        disabled={!apiOn || !e.sourceId || actingId === e.sourceId}
                        onClick={() => sendReminder(e.sourceId)}
                        className="gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {view !== "reminders" && (
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          {[
            ["deadline", "Deadline"],
            ["reminder", "Reminder Draft"],
            ["meeting", "Meeting"],
            ["close", "Close of Escrow"],
            ["task", "Task Due"],
          ].map(([k, label]) => (
            <div key={k} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${eventDotColors[k] || "bg-muted"}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
