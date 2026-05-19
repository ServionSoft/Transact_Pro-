import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import type { CalendarEvent } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarKindLegend from "@/components/calendar/CalendarKindLegend";
import {
  calendarDateClass,
  calendarKindBadgeClass,
  calendarKindLabel,
  calendarRowAccentClass,
} from "@/lib/calendarEventUtils";
import { propertyStreet } from "@/lib/transactionListUtils";
import { cn } from "@/lib/utils";

type Props = {
  events: CalendarEvent[];
  loading: boolean;
  monthLabel: string;
};

export default function CalendarListPanel({ events, loading, monthLabel }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading events…" : `${events.length} event${events.length === 1 ? "" : "s"} in this month`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No events this month</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Adjust filters above or change month to see deadlines and other calendar items.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id}>
                <Link
                  to={`/projects/${event.projectId}`}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border border-border/80 bg-background px-4 py-3 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between",
                    calendarRowAccentClass(event),
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-semibold uppercase tracking-wide", calendarKindBadgeClass(event.type))}
                      >
                        {calendarKindLabel(event.type)}
                      </Badge>
                      {event.isOverdue ? (
                        <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-[10px] text-destructive">
                          Overdue
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-foreground">{event.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {propertyStreet(event.propertyAddress)}
                      {event.clientName ? (
                        <>
                          <span className="mx-1.5">·</span>
                          {event.clientName}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-sm tabular-nums", calendarDateClass(event))}>
                    {event.date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CalendarKindLegend />
    </div>
  );
}
