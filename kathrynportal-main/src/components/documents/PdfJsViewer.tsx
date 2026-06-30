import { useEffect, useMemo, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";

// Vite-friendly worker reference
GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export type PdfViewportPage = {
  pageNumber: number; // 1-based
  widthPts: number; // PDF points at scale=1
  heightPts: number;
};

type Props = {
  fileData: Uint8Array | null;
  scale: number;
  onPagesMeta?: (pages: PdfViewportPage[]) => void;
  renderOverlays?: (args: { pageNumber: number; scale: number; widthPx: number; heightPx: number }) => React.ReactNode;
};

export default function PdfJsViewer({ fileData, scale, onPagesMeta, renderOverlays }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PdfViewportPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    if (!fileData) {
      setDoc(null);
      setPages([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPages([]);
    setDoc(null);
    // Important: pass a copied buffer so PDF.js worker doesn't detach caller-owned bytes.
    const task = getDocument({ data: fileData.slice() });
    void task.promise
      .then(async (pdf) => {
        if (cancelled) return;
        setDoc(pdf);
        const meta: PdfViewportPage[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          meta.push({ pageNumber: i, widthPts: viewport.width, heightPts: viewport.height });
        }
        if (!cancelled) {
          setPages(meta);
          onPagesMeta?.(meta);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDoc(null);
          setPages([]);
          setLoadError("Could not load this PDF. The file may be corrupted — try re-uploading the original.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [fileData, onPagesMeta]);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async () => {
      for (const p of pages) {
        const canvas = canvasesRef.current.get(p.pageNumber);
        if (!canvas) continue;
        const page = await doc.getPage(p.pageNumber);
        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, pages, scale]);

  const pageNodes = useMemo(
    () =>
      pages.map((p) => {
        const widthPx = Math.floor(p.widthPts * scale);
        const heightPx = Math.floor(p.heightPts * scale);
        return (
          <div
            key={p.pageNumber}
            id={`pdf-page-${p.pageNumber}`}
            className="relative mb-4"
            style={{ width: `${widthPx}px` }}
          >
            <canvas
              ref={(el) => {
                if (!el) {
                  canvasesRef.current.delete(p.pageNumber);
                  return;
                }
                canvasesRef.current.set(p.pageNumber, el);
              }}
              className="block bg-white shadow-sm border border-border"
            />
            <div className="absolute inset-0 pointer-events-none">
              {renderOverlays?.({ pageNumber: p.pageNumber, scale, widthPx, heightPx })}
            </div>
          </div>
        );
      }),
    [pages, renderOverlays, scale]
  );

  if (!fileData) return null;
  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground text-center">Loading PDF…</div>;
  }
  if (loadError) {
    return <div className="py-8 text-sm text-destructive text-center">{loadError}</div>;
  }
  if (!pages.length) {
    return <div className="py-8 text-sm text-muted-foreground text-center">No pages in this PDF.</div>;
  }

  return <div className="overflow-y-auto">{pageNodes}</div>;
}
