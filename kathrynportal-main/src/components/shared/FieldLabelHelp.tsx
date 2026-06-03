import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TransactionFieldHelp } from "@/lib/transactionFieldHelp";

type Props = {
  help: TransactionFieldHelp;
  /** Short label shown in the form (used for aria-label). */
  label: string;
};

export default function FieldLabelHelp({ help, label }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`About ${label}`}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] space-y-1 p-3 text-xs leading-relaxed">
        <p className="font-semibold text-popover-foreground">{help.fullName}</p>
        <p className="text-popover-foreground/90">{help.why}</p>
        {help.example ? (
          <p className="text-popover-foreground/75 italic">Example: {help.example}</p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
