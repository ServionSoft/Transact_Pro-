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
      <div className="p-8 max-w-5xl mx-auto">
        <p className="text-sm text-muted-foreground">{loading ? "Loading print template..." : "Transaction not found."}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/projects")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="deadlines-print-page p-4 md:p-6 max-w-5xl mx-auto print:max-w-none print:p-0">
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

      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${project.id}`)} className="gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to transaction
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={savePdfFile}>
            <Download className="w-3.5 h-3.5" /> Save PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
        </div>
      </div>

      <article className="bg-white text-slate-900 border border-slate-200 rounded-xl p-6 md:p-8 print:border-0 print:rounded-none print:p-0">
        <header className="border-b border-slate-200 pb-4 mb-5">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Transaction Deadline Schedule</p>
          <h1 className="text-2xl font-semibold mt-1">{project.propertyAddress.split(",")[0]}</h1>
          <p className="text-sm text-slate-600 mt-1">{project.name}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
            <InfoCell label="Client" value={project.clientName} />
            <InfoCell label="Type" value={project.type} />
            <InfoCell label="Stage" value={project.stage} />
            <InfoCell label="Generated" value={new Date().toLocaleDateString()} />
          </div>
        </header>

        <section>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-3 py-2 border border-slate-200 w-14">#</th>
                <th className="text-left px-3 py-2 border border-slate-200">Deadline</th>
                <th className="text-left px-3 py-2 border border-slate-200 w-40">Type</th>
                <th className="text-left px-3 py-2 border border-slate-200 w-40">Date</th>
              </tr>
            </thead>
            <tbody>
              {deadlines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 border border-slate-200 text-slate-500">
                    No deadlines available.
                  </td>
                </tr>
              ) : (
                deadlines.map((dl, idx) => (
                  <tr key={dl.id}>
                    <td className="px-3 py-2 border border-slate-200 text-slate-600">{idx + 1}</td>
                    <td className="px-3 py-2 border border-slate-200 font-medium">{dl.title}</td>
                    <td className="px-3 py-2 border border-slate-200">{dl.type}</td>
                    <td className="px-3 py-2 border border-slate-200">{fmtDate(dl.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <footer className="mt-6 text-xs text-slate-500 flex items-center justify-between">
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
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-medium truncate">{value || "—"}</p>
    </div>
  );
}

