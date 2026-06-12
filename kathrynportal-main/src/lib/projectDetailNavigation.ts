import type { TransactionDetailTabId } from "@/components/transactions/detail/transactionDetailTabs";

export type ProjectDetailLocationState = {
  tab?: TransactionDetailTabId;
  composeEmail?: string;
  composeSubject?: string;
  composeBody?: string;
  composeTemplateId?: string;
};

export function projectDetailState(
  tab: TransactionDetailTabId,
  options?: {
    composeEmail?: string;
    composeSubject?: string;
    composeBody?: string;
    composeTemplateId?: string;
  },
): ProjectDetailLocationState {
  return {
    tab,
    ...(options?.composeEmail ? { composeEmail: options.composeEmail } : {}),
    ...(options?.composeSubject ? { composeSubject: options.composeSubject } : {}),
    ...(options?.composeBody ? { composeBody: options.composeBody } : {}),
    ...(options?.composeTemplateId ? { composeTemplateId: options.composeTemplateId } : {}),
  };
}
