import { useState } from "react";
import { ChevronLeft, ChevronRight, Mail, Send, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { motion } from "framer-motion";
import { toast } from "sonner";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

// Color system: red deadline / gold reminder / blue meeting / green close
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

function classifyEventColor(title: string, type: string) {
  if (/close of escrow|coe/i.test(title)) return "close";
  if (/meeting|appointment|inspection scheduled/i.test(title)) return "meeting";
  return type;
}

export default function CalendarPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(1);
  const [view, setView] = useState<"month" | "list" | "reminders">("month");
  const calendarEvents = useAppStore(s => s.calendarEvents);
  const drafts = useAppStore(s => s.reminderDrafts);
  const dismissReminder = useAppStore(s => s.dismissReminder);
  const sendReminderAction = useAppStore(s => s.sendReminder);
  const [editing, setEditing] = useState<Record<string, { subject: string; body: string }>>({});

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarEvents.filter(e => e.date === dateStr);
  };

  const allEventsThisMonth = calendarEvents
    .filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const updateDraft = (id: string, field: "subject" | "body", value: string) => {
    setEditing(prev => ({
      ...prev,
      [id]: {
        subject: field === "subject" ? value : (prev[id]?.subject ?? drafts.find(d => d.id === id)?.subject ?? ""),
        body: field === "body" ? value : (prev[id]?.body ?? drafts.find(d => d.id === id)?.body ?? ""),
      },
    }));
  };

  const sendDraft = (id: string) => {
    const d = drafts.find(x => x.id === id);
    if (!d) return;
    sendReminderAction(id);
    toast.success("Reminder sent", { description: `${d.reminderType} → ${d.clientName}` });
  };

  const dismissDraft = (id: string) => {
    dismissReminder(id);
    toast("Draft dismissed");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader title="Calendar" subtitle="Deadlines, reminders, meetings, and closings across all transactions." />

      {/* View tabs */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {view !== "reminders" && (
            <>
              <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <h2 className="text-lg font-display font-semibold text-foreground min-w-[180px] text-center">
                {months[month]} {year}
              </h2>
              <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
            </>
          )}
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {([
            { v: "month", label: "Month" },
            { v: "list", label: "List" },
            { v: "reminders", label: `Reminders${drafts.length > 0 ? ` (${drafts.length})` : ""}` },
          ] as const).map(opt => (
            <button
              key={opt.v}
              onClick={() => setView(opt.v as typeof view)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === opt.v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {view === "month" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {days.map(d => (
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
              const isToday = year === 2026 && month === 1 && day === 24;
              const visible = events.slice(0, 2);
              const overflow = events.length - visible.length;
              return (
                <div
                  key={day}
                  className={`border-b border-r border-border min-h-[100px] p-1.5 ${isToday ? "bg-accent/5" : ""}`}
                >
                  <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday ? "bg-accent text-accent-foreground" : "text-foreground"
                  }`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {visible.map(e => {
                      const color = classifyEventColor(e.title, e.type);
                      return (
                        <Link
                          key={e.id}
                          to={`/projects/${e.projectId}`}
                          className={`block text-[10px] px-1.5 py-0.5 rounded border truncate ${eventTypeColors[color]}`}
                        >
                          {e.title}
                        </Link>
                      );
                    })}
                    {overflow > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-[10px] text-accent hover:underline font-semibold">
                            +{overflow} more
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="start">
                          <p className="text-xs font-semibold mb-2">All events on {months[month]} {day}</p>
                          <div className="space-y-1">
                            {events.map(e => {
                              const color = classifyEventColor(e.title, e.type);
                              return (
                                <Link
                                  key={e.id}
                                  to={`/projects/${e.projectId}`}
                                  className={`block text-xs px-2 py-1.5 rounded border ${eventTypeColors[color]}`}
                                >
                                  <p className="font-medium">{e.title}</p>
                                  <p className="text-[10px] opacity-75">{e.propertyAddress}</p>
                                </Link>
                              );
                            })}
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
            {allEventsThisMonth.length > 0 ? allEventsThisMonth.map((event, i) => {
              const color = classifyEventColor(event.title, event.type);
              return (
                <motion.div key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <Link to={`/projects/${event.projectId}`} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${eventTypeColors[color]}`}>
                        {color}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.propertyAddress}</p>
                      </div>
                    </div>
                    <span className="text-sm text-accent font-medium">{event.date}</span>
                  </Link>
                </motion.div>
              );
            }) : (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">No events this month.</div>
            )}
          </div>
        </div>
      )}

      {view === "reminders" && (
        <div>
          {/* Banner */}
          <div className="bg-accent/10 border-l-4 border-accent rounded-lg p-4 mb-6 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {drafts.length} reminder draft{drafts.length !== 1 ? "s" : ""} ready for your review
              </p>
              <p className="text-xs text-muted-foreground">Nothing has been sent yet — review and click Send when ready.</p>
            </div>
          </div>

          {/* Draft cards */}
          {drafts.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No reminder drafts pending. New drafts will appear here automatically as deadlines approach.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((d, i) => {
                const editedSubject = editing[d.id]?.subject ?? d.subject;
                const editedBody = editing[d.id]?.body ?? d.body;
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border border-l-4 border-l-accent rounded-lg overflow-hidden"
                  >
                    <div className="px-5 py-3 border-b border-border bg-secondary/20 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link to={`/projects/${d.projectId}`} className="text-sm font-semibold text-foreground hover:text-accent">
                          {d.projectName}
                        </Link>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">{d.clientName}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-destructive/10 text-destructive">
                          {d.reminderType}
                        </span>
                        <span className="text-xs text-accent font-medium">Due {d.deadlineDate}</span>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
                        <Input
                          value={editedSubject}
                          onChange={e => updateDraft(d.id, "subject", e.target.value)}
                          className="mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Message</label>
                        <Textarea
                          value={editedBody}
                          onChange={e => updateDraft(d.id, "body", e.target.value)}
                          rows={6}
                          className="mt-1 text-sm font-mono"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => dismissDraft(d.id)}>Dismiss</Button>
                        <Button onClick={() => sendDraft(d.id)} className="gap-2">
                          <Send className="w-4 h-4" /> Review & Send
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {view !== "reminders" && (
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          {[
            ["deadline", "Deadline"],
            ["reminder", "Reminder Draft"],
            ["meeting", "Meeting"],
            ["close", "Close of Escrow"],
          ].map(([k, label]) => (
            <div key={k} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${eventDotColors[k]}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
