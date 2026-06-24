import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Mirrors `EsignFieldInput` for drawing; kept local to avoid circular imports with `esignService`. */
export type EsignFieldOverlayInput = {
  fieldType: "signature" | "initials" | "text" | "date" | "checkbox";
  role: "vendor" | "client";
  required: boolean;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  prefilledText?: string;
  sortOrder: number;
};

const TYPE_LABEL: Record<EsignFieldOverlayInput["fieldType"], string> = {
  signature: "Signature",
  initials: "Initials",
  text: "Text",
  date: "Date",
  checkbox: "Checkbox",
};

function roleColors(role: EsignFieldOverlayInput["role"]): { fill: ReturnType<typeof rgb>; border: ReturnType<typeof rgb> } {
  if (role === "vendor") {
    return { fill: rgb(0.88, 0.92, 1), border: rgb(0.2, 0.45, 0.95) };
  }
  return { fill: rgb(0.88, 0.97, 0.9), border: rgb(0.15, 0.62, 0.35) };
}

/**
 * Draws semi-transparent field frames + labels on a PDF (PDF points, top-left field origin like the builder).
 * Used so library downloads match the template layout; DocuSign still applies tabs from DB coordinates.
 */
/** Brokerage PDFs (e.g. Compass CAR forms) are often encrypted; overlays only need read access. */
const PDF_LOAD_OPTS = { ignoreEncryption: true } as const;

export async function buildPdfWithEsignFieldOverlays(pdfBuffer: Buffer, fields: EsignFieldOverlayInput[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, PDF_LOAD_OPTS);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const sorted = [...fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  for (const field of sorted) {
    const pageIndex = Math.max(0, Math.floor(field.pageNumber) - 1);
    const page = pages[pageIndex];
    if (!page) continue;
    const { width: pageW, height: pageH } = page.getSize();
    const x = Math.max(0, Math.round(Number(field.x) || 0));
    const yTop = Math.max(0, Math.round(Number(field.y) || 0));
    const w = Math.max(1, Math.round(Number(field.width) || 1));
    const h = Math.max(1, Math.round(Number(field.height) || 1));
    const yPdf = Math.max(0, pageH - yTop - h);
    if (x >= pageW || yPdf >= pageH) continue;

    const { fill, border } = roleColors(field.role);
    const drawW = Math.min(w, pageW - x);
    const drawH = Math.min(h, pageH - yPdf);
    if (drawW < 1 || drawH < 1) continue;

    page.drawRectangle({
      x,
      y: yPdf,
      width: drawW,
      height: drawH,
      borderWidth: 1.5,
      borderColor: border,
      color: fill,
      opacity: 0.55,
    });

    const caption = field.label?.trim()
      ? field.label.trim().slice(0, 80)
      : `${field.role} · ${TYPE_LABEL[field.fieldType]}${field.required ? " *" : ""}`;
    const fontSize = Math.min(8, Math.max(6, drawH * 0.18));
    page.drawText(caption, {
      x: x + 3,
      y: Math.min(yPdf + drawH - fontSize - 2, pageH - fontSize - 1),
      size: fontSize,
      font,
      color: rgb(0.15, 0.15, 0.18),
      maxWidth: drawW - 6,
    });

    const hint = field.prefilledText?.trim();
    if (hint && (field.fieldType === "text" || field.fieldType === "date")) {
      const hintSize = Math.max(5, fontSize - 1);
      page.drawText(hint.slice(0, 200), {
        x: x + 3,
        y: yPdf + 4,
        size: hintSize,
        font,
        color: rgb(0.35, 0.35, 0.38),
        maxWidth: drawW - 6,
      });
    }

    if (field.fieldType === "checkbox") {
      const s = Math.min(drawW, drawH, 14) * 0.55;
      const cx = x + 4;
      const cy = yPdf + 4;
      page.drawRectangle({
        x: cx,
        y: cy,
        width: s,
        height: s,
        borderWidth: 1,
        borderColor: rgb(0.2, 0.2, 0.22),
      });
    }
  }

  const out = await pdfDoc.save();
  return Buffer.from(out);
}
