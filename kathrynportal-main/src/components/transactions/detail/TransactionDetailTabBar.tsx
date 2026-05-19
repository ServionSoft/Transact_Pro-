import { cn } from "@/lib/utils";
import { TRANSACTION_DETAIL_TABS, type TransactionDetailTabId } from "./transactionDetailTabs";

type Props = {
  activeTab: TransactionDetailTabId;
  onTabChange: (id: TransactionDetailTabId) => void;
};

export default function TransactionDetailTabBar({ activeTab, onTabChange }: Props) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Transaction sections"
    >
      {TRANSACTION_DETAIL_TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors md:text-sm",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
