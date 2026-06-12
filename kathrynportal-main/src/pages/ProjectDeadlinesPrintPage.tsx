import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Mail, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import { getProjectFromApi } from "@/api/projects";
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
  formatTimelineDisplayDate,
  type TimelineOverviewRow,
} from "@/lib/transactionTimelineFields";
import TransactionTimelinePrintTable from "@/components/transactions/TransactionTimelinePrintTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EmailTemplate } from "@/types/domain";

function displayRowValue(row: TimelineOverviewRow): string {
  if (row.isTextField) return row.value;
  return formatTimelineDisplayDate(row.value);
}

function fileBaseFromProject(propertyAddress: string): string {
  return propertyAddress.split(",")[0]?.trim().replace(/\s+/g, "-").toLowerCase() || "transaction";
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
    a.download = `${fileBaseFromProject(project.propertyAddress)}-timeline.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEmailTimeline = () => {
    if (!project) return;
    const openWithTemplates = (templates: EmailTemplate[]) => {
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
        }),
      });
    };
    if (getApiBaseUrl() && emailTemplates.length === 0) {
      void listEmailTemplatesFromApi()
        .then((rows) => {
          setEmailTemplates(rows);
          openWithTemplates(rows);
        })
        .catch(() => openWithTemplates(emailTemplates));
      return;
    }
    openWithTemplates(emailTemplates);
  };

  const savePdfFile = () => {
    if (!project) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const rowHeight = 22;
    const cols = showDaysColumn
      ? { idx: 28, milestone: 200, value: 90, days: 150 }
      : { idx: 36, milestone: 260, value: 130, days: 0 };
    const tableWidth = cols.idx + cols.milestone + cols.value + (showDaysColumn ? cols.days : 0);
    const startX = margin;
    let y = margin;

    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("TRANSACTION TIMELINE", startX, y);
      y += 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(20);
      doc.text(project.propertyAddress.split(",")[0] || project.name, startX, y);
      y += 16;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(project.propertyAddress, startX, y);
      y += 18;

      const summary = [
        `Client: ${project.clientName || "—"}`,
        `Escrow: ${escrowOfficer || "—"}${project.escrowCompany ? ` · ${project.escrowCompany}` : ""}`,
        `Type: ${project.type || "—"}`,
        `Stage: ${project.stage || "—"}`,
        `Generated: ${new Date().toLocaleDateString()}`,
      ];
      for (const line of summary) {
        doc.text(line, startX, y);
        y += 13;
      }
      y += 10;
    };

    const drawTableHeader = () => {
      doc.setDrawColor(215);
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, y - 14, tableWidth, rowHeight, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(35);
      doc.text("#", startX + 8, y);
      doc.text("Milestone", startX + cols.idx + 8, y);
      doc.text("Date / Value", startX + cols.idx + cols.milestone + 8, y);
      if (showDaysColumn) {
        doc.text("Days", startX + cols.idx + cols.milestone + cols.value + 8, y);
      }
      y += rowHeight;
      doc.setFont("helvetica", "normal");
    };

    drawHeader();
    drawTableHeader();

    timelineRows.forEach((row, idx) => {
      const milestoneLines = doc.splitTextToSize(row.title || "—", cols.milestone - 12);
      const valueLines = doc.splitTextToSize(displayRowValue(row) || "—", cols.value - 12);
      const daysLines = showDaysColumn
        ? doc.splitTextToSize(row.offsetLabel || "—", cols.days - 12)
        : [""];
      const contentLines = Math.max(milestoneLines.length, valueLines.length, daysLines.length, 1);
      const blockHeight = contentLines * 12 + 10;

      if (y + blockHeight + 20 > pageHeight - margin) {
        doc.addPage();
        y = margin;
        drawHeader();
        drawTableHeader();
      }

      doc.setDrawColor(225);
      doc.rect(startX, y - 14, tableWidth, blockHeight);

      const colX = [
        startX,
        startX + cols.idx,
        startX + cols.idx + cols.milestone,
        startX + cols.idx + cols.milestone + cols.value,
      ];
      doc.line(colX[1], y - 14, colX[1], y - 14 + blockHeight);
      doc.line(colX[2], y - 14, colX[2], y - 14 + blockHeight);
      if (showDaysColumn) {
        doc.line(colX[3], y - 14, colX[3], y - 14 + blockHeight);
      }

      doc.setFontSize(10);
      doc.setTextColor(30);
      doc.text(String(idx + 1), startX + 8, y);
      doc.text(milestoneLines, startX + cols.idx + 8, y);
      doc.text(valueLines, startX + cols.idx + cols.milestone + 8, y);
      if (showDaysColumn) {
        doc.text(daysLines, startX + cols.idx + cols.milestone + cols.value + 8, y);
      }

      y += blockHeight;
    });

    doc.save(`${fileBaseFromProject(project.propertyAddress)}-timeline.pdf`);
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
          <Button variant="outline" size="sm" className="h-10 gap-1 px-2 text-xs sm:px-3 sm:text-sm" onClick={handleEmailTimeline}>
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Email timeline</span>
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

        <footer className="mt-6 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Prepared for client presentation.</span>
          <Link to={`/projects/${project.id}`} className="no-print underline underline-offset-2">
            Open transaction
          </Link>
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
