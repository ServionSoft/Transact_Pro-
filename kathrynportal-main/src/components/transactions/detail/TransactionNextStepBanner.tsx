import { useEffect, useRef, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { dueDateBucket, dueDateClass } from "@/lib/transactionListUtils";
import { formatUsDateDisplay } from "@/lib/displayFormat";
import { cn } from "@/lib/utils";

type Props = {
  nextStep: string;
  nextStepDate: string;
  canEdit: boolean;
  saving?: boolean;
  onSave: (text: string, date: string) => void;
};

export default function TransactionNextStepBanner({
  nextStep,
  nextStepDate,
  canEdit,
  saving = false,
  onSave,
}: Props) {
  const [text, setText] = useState(nextStep);
  const [date, setDate] = useState(nextStepDate);
  const lastSaved = useRef({ text: nextStep, date: nextStepDate });
  const dueBucket = dueDateBucket(canEdit ? date : nextStepDate);

  useEffect(() => {
    setText(nextStep);
    setDate(nextStepDate);
    lastSaved.current = { text: nextStep, date: nextStepDate };
  }, [nextStep, nextStepDate]);

  const commitIfChanged = () => {
    const trimmedText = text.trim();
    const trimmedDate = date.trim();
    if (
      trimmedText === lastSaved.current.text.trim() &&
      trimmedDate === lastSaved.current.date.trim()
    ) {
      return;
    }
    onSave(trimmedText || "No next step set", trimmedDate);
  };

  if (!canEdit) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 px-4 py-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-foreground">{nextStep || "No next step set"}</p>
          <p className={cn("mt-0.5 text-xs tabular-nums", dueDateClass(dueBucket))}>
            {nextStepDate?.trim() ? `Due ${formatUsDateDisplay(nextStepDate)}` : "No due date"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-accent/25 bg-accent/5 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0 text-accent" />
        <span className="text-sm font-medium text-foreground">Next step</span>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
        <span className="hidden text-xs text-muted-foreground sm:inline">Saves when you leave a field</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitIfChanged}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="What is the next action?"
          className="flex-1 border-transparent bg-background/80 shadow-none focus-visible:border-input"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={commitIfChanged}
          className={cn(
            "w-full border-transparent bg-background/80 shadow-none focus-visible:border-input sm:w-44",
            dueDateClass(dueBucket),
          )}
        />
      </div>
    </div>
  );
}
