import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  defaultOpen?: boolean;
};

export default function CollapsibleSectionCard({
  title,
  children,
  className,
  action,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-t-xl px-4 py-3 text-left transition-colors hover:bg-muted/30"
          >
            <span className="flex min-w-0 items-center gap-2">
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
              <span className="font-display text-sm font-semibold text-foreground">{title}</span>
            </span>
            {action ? <span className="shrink-0 text-xs text-muted-foreground">{action}</span> : null}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
