import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export default function SectionCard({ title, children, className, action }: Props) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
