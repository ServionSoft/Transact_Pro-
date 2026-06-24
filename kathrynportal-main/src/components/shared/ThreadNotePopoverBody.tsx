import { useState } from "react";
import { noteTextLooksLong } from "@/lib/documentChecklistNoteUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  clampLines?: 2 | 4;
};

export default function ThreadNotePopoverBody({ text, clampLines = 4 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLong = noteTextLooksLong(text);
  const showClamped = isLong && !expanded;

  const body = (
    <p
      className={cn(
        "mt-1 whitespace-pre-wrap break-all text-xs text-foreground",
        showClamped && (clampLines === 2 ? "line-clamp-2" : "line-clamp-4"),
      )}
    >
      {text}
    </p>
  );

  return (
    <div className="min-w-0">
      {showClamped ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>{body}</TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm whitespace-pre-wrap break-all text-xs">
              {text}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        body
      )}
      {isLong ? (
        <button
          type="button"
          className="mt-1 text-[10px] font-medium text-accent hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
