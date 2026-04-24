import { CRM_DOCUMENT_VAULT_PROJECT_ID } from "@/data/mockData";
import PageHeader from "@/components/shared/PageHeader";
import TransactionDocumentsWorkspace from "@/components/documents/TransactionDocumentsWorkspace";

export default function DocumentsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Documents"
        subtitle="Your CRM file library — not tied to a client or transaction. Folders help you organize uploads now; document rules from Settings will drive sets and workflows later."
      />

      <div className="mt-8">
        <TransactionDocumentsWorkspace projectId={CRM_DOCUMENT_VAULT_PROJECT_ID} view="pool-only" />
      </div>
    </div>
  );
}
