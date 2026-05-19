import { Clock, PenLine, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dueDateBucket, dueDateClass } from "@/lib/transactionListUtils";
import { cn } from "@/lib/utils";

type Props = {
  nextStep: string;
  nextStepDate: string;
  editing: boolean;
  editText: string;
  editDate: string;
  onEditText: (v: string) => void;
  onEditDate: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
};

export default function TransactionNextStepBanner({
  nextStep,
  nextStepDate,
  editing,
  editText,
  editDate,
  onEditText,
  onEditDate,
  onStartEdit,
  onCancelEdit,
  onSave,
}: Props) {
  const dueBucket = dueDateBucket(nextStepDate);

  if (editing) {
    return (
      <div className="rounded-lg border border-accent/25 bg-accent/5 px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <PenLine className="h-4 w-4 shrink-0 text-accent" />
          <span className="text-sm font-medium text-foreground">Edit next step</span>
        </div>
        <div className="space-y-3">
          <Input value={editText} onChange={(e) => onEditText(e.target.value)} placeholder="What is the next action?" />
          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={editDate} onChange={(e) => onEditDate(e.target.value)} className="w-44 sm:w-48" />
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X className="mr-1 h-3 w-3" /> Cancel
              </Button>
              <Button size="sm" onClick={onSave}>
                <Save className="mr-1 h-3 w-3" /> Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/30 px-4 py-3">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">{nextStep || "No next step set"}</p>
        <p className={cn("mt-0.5 text-xs tabular-nums", dueDateClass(dueBucket))}>
          {nextStepDate?.trim() ? `Due ${nextStepDate}` : "No due date"}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onStartEdit} className="h-8 shrink-0 gap-1">
        <PenLine className="h-3 w-3" /> Update
      </Button>
    </div>
  );
}
