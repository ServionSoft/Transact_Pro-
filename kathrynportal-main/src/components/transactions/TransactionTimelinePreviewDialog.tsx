import type { TimelineOverviewRow } from "@/lib/transactionTimelineFields";
import TransactionTimelinePrintTable from "@/components/transactions/TransactionTimelinePrintTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: TimelineOverviewRow[];
  propertyAddress: string;
  transactionName?: string;
  clientName?: string;
  escrowOfficer?: string;
  escrowCompany?: string;
  transactionType?: string;
};

export default function TransactionTimelinePreviewDialog({
  open,
  onOpenChange,
  rows,
  propertyAddress,
  transactionName,
  clientName,
  escrowOfficer,
  escrowCompany,
  transactionType,
}: Props) {
  const street = propertyAddress.split(",")[0]?.trim() || propertyAddress || "Transaction";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Timeline preview</DialogTitle>
        </DialogHeader>
        <article className="min-w-0 text-slate-900">
          <header className="mb-4 border-b border-slate-200 pb-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Transaction Timeline</p>
            <h2 className="mt-1 break-words text-lg font-semibold">{street}</h2>
            {transactionName ? (
              <p className="mt-1 break-words text-sm text-slate-600">{transactionName}</p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <PreviewCell label="Client" value={clientName} />
              <PreviewCell label="Escrow officer" value={escrowOfficer} />
              <PreviewCell label="Escrow company" value={escrowCompany} />
              <PreviewCell label="Type" value={transactionType} />
            </div>
          </header>
          <TransactionTimelinePrintTable rows={rows} compact />
        </article>
      </DialogContent>
    </Dialog>
  );
}

function PreviewCell({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="break-words font-medium">{value?.trim() || "—"}</p>
    </div>
  );
}
