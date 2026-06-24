import { cn } from "@/lib/utils";

const LEGEND_ITEMS: { key: string; label: string; dotClass: string }[] = [
  { key: "deadline", label: "Deadline", dotClass: "bg-destructive" },
  { key: "reminder", label: "Reminder draft", dotClass: "bg-amber-500" },
  { key: "meeting", label: "Meeting", dotClass: "bg-info" },
  { key: "close", label: "Close of escrow", dotClass: "bg-success" },
  { key: "task", label: "Next step", dotClass: "bg-info" },
  { key: "overdue", label: "Overdue row", dotClass: "bg-destructive ring-2 ring-destructive/30 ring-offset-1" },
];

type Props = {
  className?: string;
  showOverdue?: boolean;
};

/** Color key for calendar event types — matches list row badges and month grid dots. */
export default function CalendarKindLegend({ className, showOverdue = true }: Props) {
  const items = showOverdue ? LEGEND_ITEMS : LEGEND_ITEMS.filter((i) => i.key !== "overdue");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-muted/20 px-4 py-3 sm:px-5",
        className,
      )}
      aria-label="Calendar color legend"
    >
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.dotClass)} aria-hidden />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
