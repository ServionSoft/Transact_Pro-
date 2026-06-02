import { CRM_DOCUMENT_VAULT_PROJECT_ID } from "@/data/mockData";
import PageHeader from "@/components/shared/PageHeader";
import TransactionDocumentsWorkspace from "@/components/documents/TransactionDocumentsWorkspace";

export default function DocumentsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Documents"
        subtitle="CRM eSign template library — upload PDF or Word (converted on the server), place fields, and use templates in document rules and transactions."
      />

      <div className="mt-8">
        <TransactionDocumentsWorkspace projectId={CRM_DOCUMENT_VAULT_PROJECT_ID} view="pool-only" />
      </div>
    </div>
  );
}
