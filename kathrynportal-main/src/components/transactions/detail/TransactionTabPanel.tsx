import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** When false, panel is a flex column for children that manage their own scroll. */
  scroll?: boolean;
};

export default function TransactionTabPanel({ children, className, scroll = true }: Props) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 pt-4",
        scroll ? "overflow-y-auto overscroll-contain" : "flex flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
