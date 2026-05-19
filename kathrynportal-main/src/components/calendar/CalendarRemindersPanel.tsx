import { Link } from "react-router-dom";
import { Mail, Send, Sparkles } from "lucide-react";
import type { CalendarEvent } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarKindLegend from "@/components/calendar/CalendarKindLegend";
import { calendarDateClass, calendarRowAccentClass } from "@/lib/calendarEventUtils";
import { propertyStreet } from "@/lib/transactionListUtils";
import { cn } from "@/lib/utils";

type Props = {
  events: CalendarEvent[];
  loading: boolean;
  apiOn: boolean;
  actingId: string | null;
  onSend: (sourceId?: string) => void;
  onDismiss: (sourceId?: string) => void;
};

export default function CalendarRemindersPanel({
  events,
  loading,
  apiOn,
  actingId,
  onSend,
  onDismiss,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-amber-500/10 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {loading
                ? "Loading reminder drafts…"
                : `${events.length} reminder draft${events.length === 1 ? "" : "s"} across all dates`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Timeline reminders and saved draft rows ready to send or dismiss.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No reminder drafts</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Save drafts from transaction timelines or calendar context menus when API is connected.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li
                key={e.id}
                className={cn(
                  "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
                  calendarRowAccentClass(e),
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Link
                      to={`/projects/${e.projectId}`}
                      className="truncate text-sm font-semibold text-foreground hover:text-accent"
                    >
                      {e.projectName}
                    </Link>
                    {e.clientName ? (
                      <span className="text-xs text-muted-foreground">· {e.clientName}</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-destructive/40 bg-destructive/10 text-[10px] font-bold uppercase tracking-wide text-destructive"
                    >
                      Reminder draft
                    </Badge>
                    <span className={cn("text-xs tabular-nums", calendarDateClass(e))}>Due {e.date}</span>
                  </div>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{propertyStreet(e.propertyAddress)}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!apiOn || !e.sourceId || actingId === e.sourceId}
                      onClick={() => onDismiss(e.sourceId)}
                    >
                      Dismiss
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!apiOn || !e.sourceId || actingId === e.sourceId}
                      onClick={() => onSend(e.sourceId)}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CalendarKindLegend showOverdue={false} />
    </div>
  );
}
