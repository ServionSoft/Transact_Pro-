import type { CalendarEvent } from "@/data/mockData";

export function calendarKindLabel(type: CalendarEvent["type"]): string {
  if (type === "close") return "Close of escrow";
  if (type === "meeting") return "Meeting";
  if (type === "task") return "Task due";
  if (type === "reminder") return "Reminder draft";
  return "Deadline";
}

export function calendarKindBadgeClass(type: CalendarEvent["type"]): string {
  switch (type) {
    case "deadline":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "reminder":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "task":
      return "border-info/40 bg-info/10 text-info";
    case "meeting":
      return "border-info/40 bg-info/10 text-info";
    case "close":
      return "border-success/40 bg-success/10 text-success";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

export function calendarRowAccentClass(event: Pick<CalendarEvent, "type" | "isOverdue">): string {
  if (event.isOverdue) return "border-l-[3px] border-l-destructive bg-destructive/5";
  switch (event.type) {
    case "deadline":
      return "border-l-[3px] border-l-destructive/70";
    case "reminder":
      return "border-l-[3px] border-l-amber-500";
    case "task":
      return "border-l-[3px] border-l-sky-500";
    case "meeting":
      return "border-l-[3px] border-l-violet-500";
    case "close":
      return "border-l-[3px] border-l-emerald-500";
    default:
      return "border-l-[3px] border-l-border";
  }
}

export function calendarDateClass(event: Pick<CalendarEvent, "type" | "isOverdue">): string {
  if (event.isOverdue) return "text-destructive font-semibold";
  switch (event.type) {
    case "deadline":
      return "text-destructive/90 font-medium";
    case "reminder":
      return "text-amber-700 dark:text-amber-300 font-medium";
    case "task":
    case "meeting":
      return "text-info font-medium";
    case "close":
      return "text-success font-medium";
    default:
      return "text-foreground font-medium";
  }
}
