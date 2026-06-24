import { useState } from "react";
import type { ThreadNote } from "@/types/threadNote";
import {
  latestChecklistNote,
  noteMetaLine,
  noteTextLooksLong,
} from "@/lib/documentChecklistNoteUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  notes: ThreadNote[];
  onOpenAllNotes: () => void;
  className?: string;
};

export default function ThreadNotesPreview({ notes, onOpenAllNotes, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const latest = latestChecklistNote(notes);
  const olderCount = notes.length > 1 ? notes.length - 1 : 0;
  const multiNote = notes.length > 1;

  if (!latest) {
    return (
      <button
        type="button"
        className={cn(
          "max-w-full text-left text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
          className,
        )}
        onClick={onOpenAllNotes}
      >
        Add note…
      </button>
    );
  }

  const meta = noteMetaLine(latest);
  const canExpandInCell = !multiNote && noteTextLooksLong(latest.text);
  const expandedInCell = canExpandInCell && expanded;
  const showClamped = !expandedInCell;

  const textButton = (
    <button
      type="button"
      className={cn(
        "block w-full max-w-full min-w-0 text-left text-xs text-foreground break-all",
        showClamped && "line-clamp-2 cursor-pointer hover:text-accent",
        expandedInCell && "whitespace-pre-wrap",
      )}
      onClick={() => {
        if (multiNote) {
          onOpenAllNotes();
          return;
        }
        if (canExpandInCell) setExpanded((v) => !v);
      }}
    >
      {latest.text}
    </button>
  );

  return (
    <div className={cn("min-w-0 max-w-full space-y-0.5 overflow-hidden", className)}>
      <p className="break-words text-[10px] text-muted-foreground">{meta}</p>
      {showClamped ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>{textButton}</TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap break-all text-xs">
              {latest.text}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        textButton
      )}
      {expandedInCell ? (
        <button
          type="button"
          className="text-[10px] font-medium text-accent hover:underline"
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      ) : null}
      {olderCount > 0 ? (
        <button
          type="button"
          className="text-[10px] font-medium text-accent hover:underline"
          onClick={onOpenAllNotes}
        >
          +{olderCount} more note{olderCount === 1 ? "" : "s"}
        </button>
      ) : canExpandInCell && !expandedInCell ? (
        <button
          type="button"
          className="text-[10px] font-medium text-muted-foreground hover:text-accent hover:underline"
          onClick={() => setExpanded(true)}
        >
          Show more
        </button>
      ) : null}
    </div>
  );
}
