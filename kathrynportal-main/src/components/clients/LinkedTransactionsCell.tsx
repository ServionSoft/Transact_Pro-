import { Link } from "react-router-dom";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export type LinkedTransactionSummary = {
  id: string;
  propertyAddress: string;
  name: string;
};

function transactionLabel(t: LinkedTransactionSummary): string {
  const addr = t.propertyAddress.trim();
  if (addr) {
    const first = addr.split(",")[0]?.trim();
    return first || addr;
  }
  return t.name.trim() || "Transaction";
}

type LinkedTransactionsCellProps = {
  transactions: LinkedTransactionSummary[];
};

export default function LinkedTransactionsCell({ transactions }: LinkedTransactionsCellProps) {
  if (transactions.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const first = transactions[0]!;
  const rest = transactions.slice(1);

  return (
    <div className="flex min-w-0 max-w-[240px] flex-col gap-0.5 text-sm">
      <Link
        to={`/projects/${first.id}`}
        className="truncate font-medium text-primary hover:underline"
        title={first.propertyAddress || first.name}
        onClick={(e) => e.stopPropagation()}
      >
        {transactionLabel(first)}
      </Link>
      {rest.length > 0 ? (
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="w-fit cursor-pointer text-left text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              +{rest.length} more
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            side="bottom"
            align="start"
            className="z-[200] w-56 border border-border bg-popover p-3 text-popover-foreground shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold text-foreground">Linked transactions</p>
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {transactions.map((t) => (
                <li key={t.id}>
                  <Link
                    to={`/projects/${t.id}`}
                    className="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                    title={t.propertyAddress || t.name}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {transactionLabel(t)}
                  </Link>
                </li>
              ))}
            </ul>
          </HoverCardContent>
        </HoverCard>
      ) : null}
    </div>
  );
}
