import { CRM_DOCUMENT_VAULT_PROJECT_ID } from "@/data/mockData";
import PageHeader from "@/components/shared/PageHeader";
import TransactionDocumentsWorkspace from "@/components/documents/TransactionDocumentsWorkspace";

export default function DocumentsPage() {
  return (
    <div className="page-padding mx-auto w-full max-w-7xl space-y-4 pb-8 sm:space-y-6">
      <PageHeader
        title="Documents"
        subtitle="CRM eSign template library — upload PDF or Word (converted on the server), place fields, and use templates in document rules and transactions."
      />

      <TransactionDocumentsWorkspace projectId={CRM_DOCUMENT_VAULT_PROJECT_ID} view="pool-only" />
    </div>
  );
}
