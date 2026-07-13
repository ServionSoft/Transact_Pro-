import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Mail, Printer } from "lucide-react";
import { getProjectFromApi } from "@/api/projects";
import { uploadProjectStoredFileForEmail } from "@/api/storedFiles";
import type { Project } from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { listEmailTemplatesFromApi } from "@/api/emailTemplates";
import { buildTimelineEmailComposePrefill } from "@/lib/emailTemplateTokens";
import { projectDetailState } from "@/lib/projectDetailNavigation";
import { getTransactionRecipientSuggestions } from "@/lib/transactionRecipientSuggestions";
import { resolveProjectEscrowOfficer } from "@/lib/transactionMetadataParties";
import {
  buildOverviewTimelineRows,
  type TimelineOverviewRow,
} from "@/lib/transactionTimelineFields";
import {
  buildTimelinePdfDoc,
  buildTimelinePdfFile,
  timelineFileBase,
  timelinePdfFileName,
  timelineRowDisplayValue,
} from "@/lib/timelinePdf";
import type { EmailComposeAttachment } from "@/types/emailCompose";
import TransactionTimelinePrintTable from "@/components/transactions/TransactionTimelinePrintTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EmailTemplate } from "@/types/domain";

function displayRowValue(row: TimelineOverviewRow): string {
  return timelineRowDisplayValue(row);
}

export default function ProjectDeadlinesPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const upsertProject = useAppStore((s) => s.upsertProject);
  const clients = useAppStore((s) => s.clients);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    if (getApiBaseUrl()) {
      void getProjectFromApi(id)
        .then((p) => {
          if (cancelled) return;
          upsertProject(p);
          setProject(p);
        })
        .catch((e) => {
          if (!cancelled) {
            toast.error(e instanceof Error ? e.message : "Could not load transaction.");
            const cached = useAppStore.getState().projects.find((p) => p.id === id) ?? null;
            setProject(cached);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      const cached = useAppStore.getState().projects.find((p) => p.id === id) ?? null;
      setProject(cached);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [id, upsertProject]);

  const client = useMemo(
    () => (project ? clients.find((c) => c.id === project.clientId) : undefined),
    [clients, project],
  );
  const metadataRecord =
    project?.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : undefined;
  const timelineRows = useMemo(
    () => buildOverviewTimelineRows(metadataRecord, project?.deadlines ?? []),
    [metadataRecord, project?.deadlines],
  );
  const showDaysColumn = timelineRows.some((r) => r.offsetLabel);
  const escrowOfficer = useMemo(
    () => (project ? resolveProjectEscrowOfficer(project) : ""),
    [project],
  );

  const exportCsv = () => {
    if (!project) return;
    const escapeCsv = (value: string) => {
      const v = value ?? "";
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, "\"\"")}"`;
      return v;
    };
    const header = showDaysColumn
      ? ["Milestone", "Date/Value", "Days", "Transaction", "Property Address", "Client", "Escrow Officer"]
      : ["Milestone", "Date/Value", "Transaction", "Property Address", "Client", "Escrow Officer"];
    const rows = [
      header,
      ...timelineRows.map((row) =>
        showDaysColumn
          ? [
              row.title,
              displayRowValue(row),
              row.offsetLabel ?? "",
              project.name,
              project.propertyAddress,
              project.clientName,
              escrowOfficer,
            ]
          : [
              row.title,
              displayRowValue(row),
              project.name,
              project.propertyAddress,
              project.clientName,
              escrowOfficer,
            ],
      ),
    ];
    const csv = `${rows.map((r) => r.map((c) => escapeCsv(String(c ?? ""))).join(",")).join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${timelineFileBase(project.propertyAddress)}-timeline.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [emailBusy, setEmailBusy] = useState(false);

  const handleEmailTimeline = () => {
    if (!project || emailBusy) return;
    const openWithTemplates = (templates: EmailTemplate[], attachments: EmailComposeAttachment[]) => {
      const prefill = buildTimelineEmailComposePrefill(project, client, templates);
      const suggestions = getTransactionRecipientSuggestions(project, client);
      const suggestedTo =
        suggestions.find((s) => /agent|escrow|buyer|seller/i.test(s.label))?.email ||
        suggestions[0]?.email ||
        client?.email?.trim() ||
        "";
      navigate(`/projects/${project.id}`, {
        state: projectDetailState("emails", {
          composeEmail: suggestedTo,
          composeSubject: prefill.subject,
          composeBody: prefill.body,
          composeTemplateId: prefill.templateId,
          composeAttachments: attachments,
        }),
      });
    };

    const run = async () => {
      setEmailBusy(true);
      try {
        const templates =
          getApiBaseUrl() && emailTemplates.length === 0
            ? await listEmailTemplatesFromApi().then((rows) => {
                setEmailTemplates(rows);
                return rows;
              }).catch(() => emailTemplates)
            : emailTemplates;

        let attachments: EmailComposeAttachment[] = [];
        // Attachments live in the server file pool, so we can only auto-attach when the API is configured.
        if (getApiBaseUrl() && timelineRows.length > 0) {
          try {
            const file = buildTimelinePdfFile(project, timelineRows, { escrowOfficer });
            const uploaded = await uploadProjectStoredFileForEmail(project.id, file);
            attachments = [
              {
                storedFileId: uploaded.id,
                name: uploaded.name,
                sizeBytes: file.size,
              },
            ];
          } catch {
            toast.error("Could not attach the timeline PDF automatically. You can add it manually.");
          }
        }
        openWithTemplates(templates, attachments);
      } finally {
        setEmailBusy(false);
      }
    };

    void run();
  };

  const savePdfFile = () => {
    if (!project) return;
    const doc = buildTimelinePdfDoc(project, timelineRows, { escrowOfficer });
    doc.save(timelinePdfFileName(project));
    toast.success("PDF downloaded.");
  };

  if (loading || !project) {
    return (
      <div className="page-padding mx-auto w-full max-w-5xl">
        <p className="text-sm text-muted-foreground">{loading ? "Loading print template..." : "Transaction not found."}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/projects")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="deadlines-print-page page-padding mx-auto w-full min-w-0 max-w-5xl print:max-w-none print:p-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden !important; }
          .deadlines-print-page, .deadlines-print-page * { visibility: visible !important; }
          .deadlines-print-page {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="no-print mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/projects/${project.id}`)}
          className="h-10 w-full justify-start gap-1 sm:w-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" /> Back to transaction
        </Button>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          <Button variant="outline" size="sm" className="h-10 gap-1 px-2 text-xs sm:px-3 sm:text-sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Print</span>
          </Button>
          <Button variant="outline" size="sm" className="h-10 gap-1 px-2 text-xs sm:px-3 sm:text-sm" onClick={savePdfFile}>
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Save PDF</span>
          </Button>
          <Button variant="outline" size="sm" className="h-10 gap-1 px-2 text-xs sm:px-3 sm:text-sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">CSV</span>
          </Button>
          <Button variant="outline" size="sm" className="h-10 gap-1 px-2 text-xs sm:px-3 sm:text-sm" onClick={handleEmailTimeline} disabled={emailBusy}>
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{emailBusy ? "Preparing…" : "Email timeline"}</span>
          </Button>
        </div>
      </div>

      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-6 md:p-8 print:rounded-none print:border-0 print:p-0">
        <header className="mb-5 border-b border-slate-200 pb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:text-xs">Transaction Timeline</p>
          <h1 className="mt-1 break-words text-xl font-semibold sm:text-2xl">
            {project.propertyAddress.split(",")[0]}
          </h1>
          <p className="mt-1 break-words text-sm text-slate-600">{project.name}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <InfoCell label="Client" value={project.clientName} />
            <InfoCell label="Escrow officer" value={escrowOfficer} />
            <InfoCell label="Escrow company" value={project.escrowCompany} />
            <InfoCell label="Type" value={project.type} />
            <InfoCell label="Stage" value={project.stage} />
            <InfoCell label="Generated" value={new Date().toLocaleDateString()} />
          </div>
        </header>

        <section className="min-w-0">
          <TransactionTimelinePrintTable rows={timelineRows} />
        </section>

        <footer className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
          <span>Deadlines that fall on weekends or holidays move to the following business day.</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Prepared for client presentation.</span>
            <Link to={`/projects/${project.id}`} className="no-print underline underline-offset-2">
              Open transaction
            </Link>
          </div>
        </footer>
      </article>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="break-words font-medium">{value || "—"}</p>
    </div>
  );
}
