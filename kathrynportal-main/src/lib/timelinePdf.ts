import { jsPDF } from "jspdf";
import type { Project } from "@/data/mockData";
import { formatTimelineDisplayDate, type TimelineOverviewRow } from "@/lib/transactionTimelineFields";

/** Required note printed at the bottom of every timeline PDF page. */
export const TIMELINE_PDF_FOOTER_NOTE =
  "Deadlines that fall on weekends or holidays move to the following business day.";

export function timelineRowDisplayValue(row: TimelineOverviewRow): string {
  if (row.isTextField) return row.value;
  return formatTimelineDisplayDate(row.value);
}

export function timelineFileBase(propertyAddress: string): string {
  return propertyAddress.split(",")[0]?.trim().replace(/\s+/g, "-").toLowerCase() || "transaction";
}

export function timelinePdfFileName(project: Pick<Project, "propertyAddress">): string {
  return `${timelineFileBase(project.propertyAddress)}-timeline.pdf`;
}

type BuildOptions = {
  escrowOfficer: string;
};

/** Builds the transaction-timeline PDF (shared by the download and email-attach flows). */
export function buildTimelinePdfDoc(
  project: Project,
  rows: TimelineOverviewRow[],
  { escrowOfficer }: BuildOptions,
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const rowHeight = 22;
  const showDaysColumn = rows.some((r) => r.offsetLabel);
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

  const anyAdjusted = rows.some((r) => r.adjusted);

  rows.forEach((row, idx) => {
    const milestoneLines = doc.splitTextToSize(row.title || "—", cols.milestone - 12);
    const valueText = `${timelineRowDisplayValue(row) || "—"}${row.adjusted ? " *" : ""}`;
    const valueLines = doc.splitTextToSize(valueText, cols.value - 12);
    const daysLines = showDaysColumn
      ? doc.splitTextToSize(row.offsetLabel || "—", cols.days - 12)
      : [""];
    const contentLines = Math.max(milestoneLines.length, valueLines.length, daysLines.length, 1);
    const blockHeight = contentLines * 12 + 10;

    // Leave room for the two-line footer note at the bottom of the page.
    if (y + blockHeight + 40 > pageHeight - margin) {
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

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    if (anyAdjusted) {
      doc.text("* Moved to the next business day (weekend or holiday).", margin, pageHeight - 34);
    }
    doc.text(TIMELINE_PDF_FOOTER_NOTE, margin, pageHeight - 24);
    doc.text("Prepared for client presentation.", margin, pageHeight - 14);
  }

  return doc;
}

/** Timeline PDF as a File, ready to upload as an email attachment. */
export function buildTimelinePdfFile(
  project: Project,
  rows: TimelineOverviewRow[],
  options: BuildOptions,
): File {
  const doc = buildTimelinePdfDoc(project, rows, options);
  const blob = doc.output("blob");
  return new File([blob], timelinePdfFileName(project), { type: "application/pdf" });
}
