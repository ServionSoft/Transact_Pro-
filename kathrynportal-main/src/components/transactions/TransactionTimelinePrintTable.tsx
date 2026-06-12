import {
  formatTimelineDisplayDate,
  type TimelineOverviewRow,
} from "@/lib/transactionTimelineFields";
import { cn } from "@/lib/utils";

type Props = {
  rows: TimelineOverviewRow[];
  /** Smaller padding for embedded previews (e.g. Review step). */
  compact?: boolean;
  className?: string;
};

function displayValue(row: TimelineOverviewRow): string {
  if (row.isTextField) return row.value;
  return formatTimelineDisplayDate(row.value);
}

export default function TransactionTimelinePrintTable({ rows, compact, className }: Props) {
  const showDaysColumn = rows.some((r) => r.offsetLabel);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 px-3 py-4 text-sm text-slate-500">
        No timeline dates or values are set for this transaction.
      </p>
    );
  }

  const cellPad = compact ? "px-2 py-1.5" : "px-3 py-2";
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <>
      <ul className={cn("space-y-3 md:hidden print:hidden", className)}>
        {rows.map((row, idx) => (
          <li key={`${row.title}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 text-xs font-semibold text-slate-500">#{idx + 1}</span>
              {!row.isTextField ? (
                <span className="shrink-0 text-xs font-medium text-slate-700">{displayValue(row)}</span>
              ) : null}
            </div>
            <p className="mt-2 break-words text-sm font-medium text-slate-900">{row.title}</p>
            {row.isTextField ? (
              <p className="mt-1 break-words text-xs text-slate-700">{row.value}</p>
            ) : row.offsetLabel ? (
              <p className="mt-1 text-[11px] text-slate-500">{row.offsetLabel}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className={cn("hidden min-w-0 overflow-x-auto overscroll-x-contain md:block print:block", className)}>
        <table className={cn("w-full min-w-[32rem] border-collapse", textSize)}>
          <thead>
            <tr className="bg-slate-50">
              <th className={cn("w-14 border border-slate-200 text-left", cellPad)}>#</th>
              <th className={cn("min-w-[12rem] border border-slate-200 text-left", cellPad)}>Milestone</th>
              <th className={cn("w-40 border border-slate-200 text-left", cellPad)}>Date / Value</th>
              {showDaysColumn ? (
                <th className={cn("min-w-[10rem] border border-slate-200 text-left", cellPad)}>Days</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.title}-${idx}`}>
                <td className={cn("border border-slate-200 text-slate-600", cellPad)}>{idx + 1}</td>
                <td className={cn("border border-slate-200 font-medium break-words", cellPad)}>{row.title}</td>
                <td className={cn("border border-slate-200 break-words", cellPad)}>{displayValue(row)}</td>
                {showDaysColumn ? (
                  <td className={cn("border border-slate-200 text-slate-600 break-words", cellPad)}>
                    {row.offsetLabel ?? "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
