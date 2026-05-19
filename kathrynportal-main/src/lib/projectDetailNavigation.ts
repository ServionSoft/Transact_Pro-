import type { TransactionDetailTabId } from "@/components/transactions/detail/transactionDetailTabs";

export type ProjectDetailLocationState = {
  tab?: TransactionDetailTabId;
  composeEmail?: string;
};

export function projectDetailState(
  tab: TransactionDetailTabId,
  options?: { composeEmail?: string },
): ProjectDetailLocationState {
  return {
    tab,
    ...(options?.composeEmail ? { composeEmail: options.composeEmail } : {}),
  };
}
