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
        "pt-4",
        scroll
          ? "lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
          : "flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
