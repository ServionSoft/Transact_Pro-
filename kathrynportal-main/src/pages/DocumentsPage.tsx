import { CRM_DOCUMENT_VAULT_PROJECT_ID } from "@/data/mockData";
import PageHeader from "@/components/shared/PageHeader";
import TransactionDocumentsWorkspace from "@/components/documents/TransactionDocumentsWorkspace";
import { listPageRootClass, listPageShellClass } from "@/lib/listPageLayout";

export default function DocumentsPage() {
  return (
    <div className={listPageRootClass}>
      <div className="shrink-0">
        <PageHeader
          title="Documents"
          subtitle="CRM eSign template library — upload PDF or Word (converted on the server), place fields, and use templates in document rules and transactions."
        />
      </div>

      <div className={listPageShellClass}>
        <TransactionDocumentsWorkspace
          projectId={CRM_DOCUMENT_VAULT_PROJECT_ID}
          view="pool-only"
          boundedPoolScroll
        />
      </div>
    </div>
  );
}
