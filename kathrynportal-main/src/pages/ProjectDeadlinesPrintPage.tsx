import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import { getProjectFromApi } from "@/api/projects";
import { useAppStore } from "@/store/appStore";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function fmtDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function ProjectDeadlinesPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fromStore = useAppStore((s) => s.projects.find((p) => p.id === id));
  const upsertProject = useAppStore((s) => s.upsertProject);
  const [loading, setLoading] = useState(!fromStore && Boolean(getApiBaseUrl()));
  const [localProjectId, setLocalProjectId] = useState<string | null>(fromStore?.id ?? null);

  useEffect(() => {
    if (fromStore?.id) setLocalProjectId(fromStore.id);
  }, [fromStore?.id]);

  useEffect(() => {
    if (!id || fromStore || !getApiBaseUrl()) return;
    let cancelled = false;
    setLoading(true);
    void getProjectFromApi(id)
      .then((p) => {
        if (cancelled) return;
        upsertProject(p);
        setLocalProjectId(p.id);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Could not load transaction.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromStore, id, upsertProject]);

  const project = useAppStore((s) => s.projects.find((p) => p.id === (localProjectId ?? id)));
  const deadlines = useMemo(
    () => [...(project?.deadlines ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [project?.deadlines]
  );

  const exportCsv = () => {
    if (!project) return;
    const escapeCsv = (value: string) => {
      const v = value ?? "";
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, "\"\"")}"`;
      return v;
    };
    const rows = [
      ["Title", "Type", "Date", "Transaction", "Property Address", "Client"],
      ...deadlines.map((dl) => [dl.title, dl.type, dl.date, project.name, project.propertyAddress, project.clientName]),
    ];
    const csv = `${rows.map((r) => r.map((c) => escapeCsv(String(c ?? ""))).join(",")).join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileBase = project.propertyAddress.split(",")[0]?.trim().replace(/\s+/g, "-").toLowerCase() || "transaction";
    a.href = url;
    a.download = `${fileBase}-deadlines.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const savePdfFile = () => {
    if (!project) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const rowHeight = 22;
    const cols = { idx: 36, deadline: 260, type: 120, date: 110 };
    const tableWidth = cols.idx + cols.deadline + cols.type + cols.date;
    const startX = margin;
    let y = margin;

    const drawHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("TRANSACTION DEADLINE SCHEDULE", startX, y);
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
      doc.text("Deadline", startX + cols.idx + 8, y);
      doc.text("Type", startX + cols.idx + cols.deadline + 8, y);
      doc.text("Date", startX + cols.idx + cols.deadline + cols.type + 8, y);
      y += rowHeight;
      doc.setFont("helvetica", "normal");
    };

    drawHeader();
    drawTableHeader();

    deadlines.forEach((dl, idx) => {
      const deadlineLines = doc.splitTextToSize(dl.title || "—", cols.deadline - 12);
      const typeLines = doc.splitTextToSize(dl.type || "—", cols.type - 12);
      const dateText = fmtDate(dl.date);
      const contentLines = Math.max(deadlineLines.length, typeLines.length, 1);
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
        startX + cols.idx + cols.deadline,
        startX + cols.idx + cols.deadline + cols.type,
      ];
      doc.line(colX[1], y - 14, colX[1], y - 14 + blockHeight);
      doc.line(colX[2], y - 14, colX[2], y - 14 + blockHeight);
      doc.line(colX[3], y - 14, colX[3], y - 14 + blockHeight);

      doc.setFontSize(10);
      doc.setTextColor(30);
      doc.text(String(idx + 1), startX + 8, y);
      doc.text(deadlineLines, startX + cols.idx + 8, y);
      doc.text(typeLines, startX + cols.idx + cols.deadline + 8, y);
      doc.text(dateText, startX + cols.idx + cols.deadline + cols.type + 8, y);

      y += blockHeight;
    });

    const fileBase = project.propertyAddress.split(",")[0]?.trim().replace(/\s+/g, "-").toLowerCase() || "transaction";
    doc.save(`${fileBase}-deadlines.pdf`);
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
        <div className="grid min-w-0 grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2">
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
        </div>
      </div>

      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 sm:p-6 md:p-8 print:rounded-none print:border-0 print:p-0">
        <header className="mb-5 border-b border-slate-200 pb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:text-xs">Transaction Deadline Schedule</p>
          <h1 className="mt-1 break-words text-xl font-semibold sm:text-2xl">
            {project.propertyAddress.split(",")[0]}
          </h1>
          <p className="mt-1 break-words text-sm text-slate-600">{project.name}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <InfoCell label="Client" value={project.clientName} />
            <InfoCell label="Type" value={project.type} />
            <InfoCell label="Stage" value={project.stage} />
            <InfoCell label="Generated" value={new Date().toLocaleDateString()} />
          </div>
        </header>

        <section className="min-w-0">
          {deadlines.length === 0 ? (
            <p className="rounded-lg border border-slate-200 px-3 py-4 text-sm text-slate-500">No deadlines available.</p>
          ) : (
            <>
              <ul className="space-y-3 md:hidden print:hidden">
                {deadlines.map((dl, idx) => (
                  <li key={dl.id} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="shrink-0 text-xs font-semibold text-slate-500">#{idx + 1}</span>
                      <span className="shrink-0 text-xs font-medium text-slate-700">{fmtDate(dl.date)}</span>
                    </div>
                    <p className="mt-2 break-words text-sm font-medium text-slate-900">{dl.title}</p>
                    <p className="mt-1 text-xs capitalize text-slate-600">{dl.type}</p>
                  </li>
                ))}
              </ul>

              <div className="hidden min-w-0 overflow-x-auto overscroll-x-contain md:block print:block">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="w-14 border border-slate-200 px-3 py-2 text-left">#</th>
                      <th className="min-w-[12rem] border border-slate-200 px-3 py-2 text-left">Deadline</th>
                      <th className="w-36 border border-slate-200 px-3 py-2 text-left">Type</th>
                      <th className="w-36 border border-slate-200 px-3 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadlines.map((dl, idx) => (
                      <tr key={dl.id}>
                        <td className="border border-slate-200 px-3 py-2 text-slate-600">{idx + 1}</td>
                        <td className="border border-slate-200 px-3 py-2 font-medium break-words">{dl.title}</td>
                        <td className="border border-slate-200 px-3 py-2 whitespace-nowrap">{dl.type}</td>
                        <td className="border border-slate-200 px-3 py-2 whitespace-nowrap">{fmtDate(dl.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
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

