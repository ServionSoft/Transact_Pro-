type SigCounts = { out: number; signed: number; awaiting: number };

type Props = { counts: SigCounts };

export default function DocuSignStatusStrip({ counts }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">DocuSign</span>
      <span className="rounded-full bg-status-out-sig/15 px-2 py-0.5 text-[11px] font-medium text-status-out-sig">
        {counts.out} out for signature
      </span>
      <span className="rounded-full bg-status-signed/15 px-2 py-0.5 text-[11px] font-medium text-status-signed">
        {counts.signed} signed
      </span>
      <span className="rounded-full bg-status-needs-sig/15 px-2 py-0.5 text-[11px] font-medium text-status-needs-sig">
        {counts.awaiting} awaiting
      </span>
    </div>
  );
}
