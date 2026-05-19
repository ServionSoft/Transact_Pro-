import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: React.ReactNode;
  className?: string;
};

export default function DetailRow({ label, value, className }: Props) {
  return (
    <div className={cn("flex items-start justify-between gap-4 text-sm", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
