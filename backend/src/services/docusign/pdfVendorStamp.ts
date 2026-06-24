import { PDFDocument } from "pdf-lib";
import type { EsignFieldInput } from "../esignService.js";

function isJpeg(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Buffer): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

/**
 * Draws SMTP vendor signature image onto PDF at each vendor `signature` field (PDF points, top-left origin).
 * Returns a new PDF buffer suitable for DocuSign with only client signing tabs.
 */
export async function stampVendorSignaturesOnPdf(
  pdfBuffer: Buffer,
  signatureBytes: Buffer,
  vendorSignatureFields: EsignFieldInput[]
): Promise<Buffer> {
  if (!vendorSignatureFields.length) {
    return pdfBuffer;
  }

  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  let image;
  if (isPng(signatureBytes)) {
    image = await pdfDoc.embedPng(signatureBytes);
  } else if (isJpeg(signatureBytes)) {
    image = await pdfDoc.embedJpg(signatureBytes);
  } else {
    try {
      image = await pdfDoc.embedPng(signatureBytes);
    } catch {
      image = await pdfDoc.embedJpg(signatureBytes);
    }
  }

  const pages = pdfDoc.getPages();
  for (const field of vendorSignatureFields) {
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
    page.drawImage(image, {
      x,
      y: yPdf,
      width: Math.min(w, pageW - x),
      height: Math.min(h, pageH - yPdf),
    });
  }

  const out = await pdfDoc.save();
  return Buffer.from(out);
}
