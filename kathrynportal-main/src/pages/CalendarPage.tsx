import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import CalendarListPanel from "@/components/calendar/CalendarListPanel";
import CalendarRemindersPanel from "@/components/calendar/CalendarRemindersPanel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
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
import { calendarKindLabel } from "@/lib/calendarEventUtils";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

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

const KIND_OPTIONS: { kind: CalendarEventApi["kind"]; label: string }[] = [
  { kind: "deadline", label: "Deadline" },
  { kind: "reminder", label: "Reminder draft" },
  { kind: "meeting", label: "Meeting" },
  { kind: "close", label: "Close of escrow" },
  { kind: "task", label: "Task due" },
];

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
  const [activeKinds, setActiveKinds] = useState<Array<CalendarEventApi["kind"]>>([
    "deadline",
    "reminder",
    "meeting",
    "close",
    "task",
  ]);

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
          toast.error("Could not load calendar events", {
            description: e instanceof Error ? e.message : "Please try again.",
          });
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
  const monthLabel = `${months[month]} ${year}`;

  const monthEvents = calendarEvents
    .filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date)));

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
              <span className="text-foreground">{calendarKindLabel(e.type)}</span>
              <span className="text-muted-foreground">Due</span>
              <span className="text-foreground">{e.date}</span>
              <span className="text-muted-foreground">Client</span>
              <span className="text-foreground">{e.clientName || "Unknown"}</span>
              <span className="text-muted-foreground">Property</span>
              <span className="truncate text-foreground">{e.propertyAddress}</span>
            </div>
            {e.isOverdue ? <p className="font-medium text-destructive">Overdue</p> : null}
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

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const showMonthNav = view !== "reminders";

  return (
    <div className="mx-auto flex min-h-0 flex-1 w-full max-w-7xl flex-col gap-6 overflow-hidden p-6 sm:p-8">
      <div className="shrink-0">
        <PageHeader
          title="Calendar"
          subtitle="Deadlines, reminders, meetings, and closings across all transactions."
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="shrink-0 space-y-3 border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {showMonthNav ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={prevMonth} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="min-w-[10rem] text-center font-display text-base font-semibold text-foreground sm:min-w-[11rem] sm:text-lg">
                  {monthLabel}
                </h2>
                <Button type="button" variant="outline" size="sm" onClick={nextMonth} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-foreground">All reminder drafts</p>
            )}

            <div className="flex gap-1 self-start rounded-lg bg-muted/40 p-1 sm:self-auto">
              {(
                [
                  { v: "month" as const, label: "Month" },
                  { v: "list" as const, label: "List" },
                  {
                    v: "reminders" as const,
                    label: `Reminders${reminderEvents.length ? ` (${reminderEvents.length})` : ""}`,
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setView(opt.v)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    view === opt.v
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {view !== "reminders" ? (
            <div className="flex flex-wrap gap-1.5">
              {KIND_OPTIONS.map(({ kind, label }) => {
                const selected = activeKinds.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() =>
                      setActiveKinds((prev) =>
                        prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
                      )
                    }
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {view === "month" && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="border-b border-border">
                <div className="grid grid-cols-7">
                  {days.map((d) => (
                    <div
                      key={d}
                      className="border-r border-border px-2 py-2 text-center text-xs font-medium uppercase text-muted-foreground last:border-r-0"
                    >
                      {d}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[100px] border-b border-r border-border bg-muted/30"
                  />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const events = getEventsForDay(day);
                  const isToday =
                    year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
                  const visible = events.slice(0, 2);
                  const overflow = events.length - visible.length;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "min-h-[100px] border-b border-r border-border p-1.5",
                        isToday && "bg-accent/5",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday ? "bg-accent text-accent-foreground" : "text-foreground",
                        )}
                      >
                        {day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {visible.map((e) => (
                          <div key={e.id}>
                            {renderEventChip(
                              e,
                              `block truncate rounded border px-1.5 py-0.5 text-[10px] ${eventTypeColors[e.type]} ${e.isOverdue ? "ring-1 ring-destructive/50" : ""}`,
                            )}
                          </div>
                        ))}
                        {overflow > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="text-[10px] font-semibold text-accent hover:underline"
                              >
                                +{overflow} more
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64" align="start">
                              <p className="mb-2 text-xs font-semibold">
                                All events on {months[month]} {day}
                              </p>
                              <div className="space-y-1">
                                {events.map((e) => (
                                  <div key={e.id}>
                                    {renderEventChip(
                                      e,
                                      `block rounded border px-2 py-1.5 text-xs ${eventTypeColors[e.type]} ${e.isOverdue ? "ring-1 ring-destructive/50" : ""}`,
                                    )}
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {view === "month" ? (
                <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-3">
                  {KIND_OPTIONS.map(({ kind, label }) => (
                    <div key={kind} className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-full", eventDotColors[kind] || "bg-muted")} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {view === "list" && (
            <CalendarListPanel events={monthEvents} loading={loading && apiOn} monthLabel={monthLabel} />
          )}

          {view === "reminders" && (
            <CalendarRemindersPanel
              events={reminderEvents}
              loading={loading && apiOn}
              apiOn={apiOn}
              actingId={actingId}
              onSend={sendReminder}
              onDismiss={dismissReminder}
            />
          )}
        </div>
      </div>
    </div>
  );
}
