import { useIsCompactNav } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRANSACTION_DETAIL_TABS, type TransactionDetailTabId } from "./transactionDetailTabs";

type Props = {
  activeTab: TransactionDetailTabId;
  onTabChange: (id: TransactionDetailTabId) => void;
};

export default function TransactionDetailTabBar({ activeTab, onTabChange }: Props) {
  const compactNav = useIsCompactNav();
  const active = TRANSACTION_DETAIL_TABS.find((tab) => tab.id === activeTab);

  if (compactNav) {
    return (
      <div className="border-b border-border pb-3">
        <Select value={activeTab} onValueChange={(value) => onTabChange(value as TransactionDetailTabId)}>
          <SelectTrigger className="h-11 w-full" aria-label="Transaction section">
            <SelectValue>
              {active ? (
                <span className="flex items-center gap-2">
                  <active.icon className="h-4 w-4 shrink-0" />
                  {active.label}
                </span>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_DETAIL_TABS.map((tab) => (
              <SelectItem key={tab.id} value={tab.id}>
                <span className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div
      className="flex gap-0.5 overflow-x-auto border-b border-border snap-x snap-mandatory scroll-px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Transaction sections"
    >
      {TRANSACTION_DETAIL_TABS.map((tab) => {
        const tabActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tabActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex min-h-[44px] shrink-0 snap-start items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors md:min-h-0 md:py-2 md:text-sm",
              tabActive
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
