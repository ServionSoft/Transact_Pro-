import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudDownload, Download, Plus, Save, Send, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toast as appToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { getDocument } from "pdfjs-dist";
import type { FileAttachment, ProjectDocument } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createEsignDocumentApi,
  deleteEsignDocumentApi,
  getEsignDocumentApi,
  listEsignDocumentsApi,
  markEsignDocumentReadyApi,
  saveEsignDocumentApi,
  sendEsignDocusignApi,
  syncDocusignCompletionApi,
  type EsignDocumentDto,
  type EsignFieldDto,
} from "@/api/esign";
import { authFetch } from "@/lib/authFetch";
import { getApiBaseUrl } from "@/lib/apiConfig";
import PdfJsViewer from "@/components/documents/PdfJsViewer";
import { getSmtpSettingsFromApi, type SmtpSettingsDto } from "@/api/smtpSettings";
import { parseSignerEmailsFromInput, validateSignerEmailListForDocuSign } from "@/lib/parseClientSignerEmails";
import type { TransactionRecipientSuggestion } from "@/lib/transactionRecipientSuggestions";
import { deleteTemplateConfirmOptions, useConfirmDialog } from "@/hooks/useConfirmDialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  docs: ProjectDocument[];
  attachments: FileAttachment[];
  prefillFromUpload?: { fileId: string; title: string; key: number } | null;
  initialDraftId?: string | null;
  /** Pre-fills client email for DocuSign send */
  defaultClientEmail?: string;
  /** Contact, metadata parties (buyers/sellers/agents/escrow/TCs), and assignees for the signer quick-pick */
  recipientEmailSuggestions?: TransactionRecipientSuggestion[];
  onEnvelopeSent?: () => void;
};

const DEFAULT_FIELD = (sortOrder: number): EsignFieldDto => ({
  fieldType: "signature",
  role: "client",
  required: true,
  pageNumber: 1,
  x: 72,
  y: 72,
  width: 180,
  height: 40,
  sortOrder,
});

const CRM_VAULT_SLUG = "crm-doc-vault";

const ESIGN_DELETE_BLOCKED_STATUSES = new Set(["sent", "completed"]);

function isPdfAttachment(file: FileAttachment): boolean {
  const type = (file.type ?? "").toLowerCase();
  const name = (file.name ?? "").toLowerCase();
  return type.includes("pdf") || name.endsWith(".pdf");
}

export default function EsignDraftSheet({
  open,
  onOpenChange,
  projectId,
  docs,
  attachments,
  prefillFromUpload,
  initialDraftId,
  defaultClientEmail = "",
  recipientEmailSuggestions = [],
  onEnvelopeSent,
}: Props) {
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const isEditingExistingEntry = Boolean(initialDraftId);
  const [documents, setDocuments] = useState<EsignDocumentDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  /** True after the first list fetch for this open session (avoids prefill racing an empty list). */
  const [listReady, setListReady] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [titleDraft, setTitleDraft] = useState("");
  const [storedFileIdDraft, setStoredFileIdDraft] = useState("");
  const [projectDocumentIdDraft, setProjectDocumentIdDraft] = useState("none");
  const [fields, setFields] = useState<EsignFieldDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfScale, setPdfScale] = useState(1.15);
  const draggingRef = useRef<{ index: number } | null>(null);
  const prefillHandledRef = useRef<Set<number>>(new Set());
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettingsDto | null>(null);
  const [vendorSignatureObjectUrl, setVendorSignatureObjectUrl] = useState<string | null>(null);
  const [clientSendEmail, setClientSendEmail] = useState("");
  const clientSendEmailSelectValue = useMemo(() => {
    const parsed = parseSignerEmailsFromInput(clientSendEmail);
    if (parsed.length !== 1) return undefined;
    const lower = parsed[0].toLowerCase();
    const hit = recipientEmailSuggestions.find((s) => s.email.toLowerCase() === lower);
    return hit ? hit.email : undefined;
  }, [clientSendEmail, recipientEmailSuggestions]);
  const [sendingEnvelope, setSendingEnvelope] = useState(false);
  const [downloadingSignedPdf, setDownloadingSignedPdf] = useState(false);
  const [syncingDocuSign, setSyncingDocuSign] = useState(false);

  const selectedDraft = useMemo(
    () => documents.find((item) => item.id === selectedDraftId) ?? null,
    [documents, selectedDraftId]
  );
  const canDeleteSelectedDraft =
    Boolean(selectedDraft) && !ESIGN_DELETE_BLOCKED_STATUSES.has(selectedDraft!.status);
  const selectedCreateFile = useMemo(
    () => attachments.find((a) => a.id === storedFileIdDraft) ?? null,
    [attachments, storedFileIdDraft]
  );
  const vendorSignatureUrl = useMemo(() => {
    const fileId = smtpSettings?.vendorSignatureFileId;
    const base = getApiBaseUrl();
    if (!fileId || !base) return null;
    return `${base}/api/projects/${encodeURIComponent(CRM_VAULT_SLUG)}/stored-files/${encodeURIComponent(fileId)}/download`;
  }, [smtpSettings]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (!open || !vendorSignatureUrl) {
      setVendorSignatureObjectUrl(null);
      return;
    }
    void authFetch(vendorSignatureUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load vendor signature image.");
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setVendorSignatureObjectUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setVendorSignatureObjectUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, vendorSignatureUrl]);

  useEffect(() => {
    if (open && defaultClientEmail?.trim()) {
      setClientSendEmail(defaultClientEmail.trim());
    }
  }, [open, defaultClientEmail]);

  const toPx = (pts: number) => pts * pdfScale;
  const toPts = (px: number) => px / pdfScale;
  const isNotFoundError = (error: unknown): boolean =>
    error instanceof Error &&
    (error.message.toLowerCase().includes("not found") || error.message.toLowerCase().includes("404"));

  useEffect(() => {
    const resolvePageUnderPointer = (clientX: number, clientY: number): { pageNumber: number; pageEl: HTMLElement } | null => {
      const pageEls = Array.from(document.querySelectorAll<HTMLElement>('[id^="pdf-page-"]'));
      for (const pageEl of pageEls) {
        const box = pageEl.getBoundingClientRect();
        if (clientX >= box.left && clientX <= box.right && clientY >= box.top && clientY <= box.bottom) {
          const pageNumber = Number(pageEl.id.replace("pdf-page-", ""));
          if (Number.isFinite(pageNumber) && pageNumber >= 1) {
            return { pageNumber, pageEl };
          }
        }
      }
      return null;
    };

    const onMouseMove = (e: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      const targetPage = resolvePageUnderPointer(e.clientX, e.clientY);
      if (!targetPage) return;
      const { pageNumber, pageEl } = targetPage;
      const box = pageEl.getBoundingClientRect();
      const relX = e.clientX - box.left;
      const relY = e.clientY - box.top;
      setFields((prev) => {
        const next = [...prev];
        const current = next[drag.index];
        if (!current) return prev;
        const wPx = toPx(current.width);
        const hPx = toPx(current.height);
        const newXpx = Math.max(0, Math.min(relX - wPx / 2, box.width - wPx));
        const newYpx = Math.max(0, Math.min(relY - hPx / 2, box.height - hPx));
        next[drag.index] = {
          ...current,
          pageNumber,
          x: Number(toPts(newXpx).toFixed(2)),
          y: Number(toPts(newYpx).toFixed(2)),
        };
        return next;
      });
      setDirty(true);
    };
    const onMouseUp = () => {
      draggingRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [pdfScale]);

  const resetBuilderState = useCallback(() => {
    setSelectedDraftId("");
    setTitleDraft("");
    setStoredFileIdDraft("");
    setProjectDocumentIdDraft("none");
    setFields([]);
    setDirty(false);
    setPdfBytes(null);
    setPreviewLoading(false);
    prefillHandledRef.current.clear();
  }, []);

  const refreshList = async () => {
    setLoadingList(true);
    try {
      const list = await listEsignDocumentsApi(projectId);
      setDocuments(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load e-sign drafts.");
    } finally {
      setLoadingList(false);
      setListReady(true);
    }
  };

  useEffect(() => {
    if (!open) {
      setListReady(false);
      resetBuilderState();
      return;
    }
    if (!initialDraftId && !prefillFromUpload) {
      resetBuilderState();
    }
    void refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId, initialDraftId, prefillFromUpload, resetBuilderState]);

  useEffect(() => {
    if (!open) return;
    if (!getApiBaseUrl()) return;
    void getSmtpSettingsFromApi()
      .then((s) => setSmtpSettings(s))
      .catch(() => setSmtpSettings(null));
  }, [open]);

  useEffect(() => {
    if (!open || !initialDraftId) return;
    setSelectedDraftId(initialDraftId);
  }, [open, initialDraftId]);

  useEffect(() => {
    if (!open || !selectedDraftId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getEsignDocumentApi(projectId, selectedDraftId);
        if (!cancelled) {
          setFields(data.fields ?? []);
          setDirty(false);
        }
      } catch (error) {
        if (!cancelled) {
          if (isNotFoundError(error)) {
            setSelectedDraftId("");
            setFields([]);
            setPdfBytes(null);
            void refreshList();
            toast.error("This draft no longer exists. List refreshed.");
            return;
          }
          toast.error(error instanceof Error ? error.message : "Could not load draft details.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, selectedDraftId]);

  useEffect(() => {
    if (!open || !prefillFromUpload || !prefillFromUpload.fileId) return;
    if (!listReady) return;
    if (prefillHandledRef.current.has(prefillFromUpload.key)) return;
    prefillHandledRef.current.add(prefillFromUpload.key);
    const existing = documents.find((d) => d.originalFileId === prefillFromUpload.fileId);
    if (existing) {
      setSelectedDraftId(existing.id);
      setTitleDraft(existing.title);
      setStoredFileIdDraft(prefillFromUpload.fileId);
      return;
    }
    setTitleDraft(prefillFromUpload.title || "New eSign Template");
    setStoredFileIdDraft(prefillFromUpload.fileId);
    setProjectDocumentIdDraft("none");
    void createEsignDocumentApi(projectId, {
      title: prefillFromUpload.title || "New eSign Template",
      storedFileId: prefillFromUpload.fileId,
      projectDocumentId: null,
    })
      .then((document) => {
        setDocuments((prev) => [document, ...prev.filter((item) => item.id !== document.id)]);
        setSelectedDraftId(document.id);
        setFields([DEFAULT_FIELD(0)]);
        setDirty(true);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not initialize e-sign draft.");
      });
  }, [open, prefillFromUpload, projectId, documents, listReady]);

  useEffect(() => {
    if (!open || !selectedDraft) return;
    const base = getApiBaseUrl();
    if (!base) return;
    const renderId = selectedDraft.renderFileId ?? selectedDraft.originalFileId;
    const url = `${base}/api/projects/${encodeURIComponent(projectId)}/stored-files/${encodeURIComponent(renderId)}/download`;
    let cancelled = false;
    setPreviewLoading(true);
    void authFetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load PDF preview file.");
        const buf = await response.arrayBuffer();
        if (!cancelled) setPdfBytes(new Uint8Array(buf));
      })
      .catch((error) => {
        if (!cancelled) {
          setPdfBytes(null);
          toast.error(error instanceof Error ? error.message : "Preview failed to load.");
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedDraft, projectId]);

  const createDraft = async () => {
    if (!storedFileIdDraft) {
      toast.error("Select an uploaded file first.");
      return;
    }
    if (!titleDraft.trim()) {
      toast.error("Template title is required.");
      return;
    }
    setCreating(true);
    try {
      const existing = documents.find((d) => d.originalFileId === storedFileIdDraft);
      if (existing) {
        setSelectedDraftId(existing.id);
        toast.success("Template already exists. Opened it.");
        return;
      }
      const document = await createEsignDocumentApi(projectId, {
        title: titleDraft.trim(),
        storedFileId: storedFileIdDraft,
        projectDocumentId: projectDocumentIdDraft === "none" ? null : projectDocumentIdDraft,
      });
      setDocuments((prev) => [document, ...prev.filter((item) => item.id !== document.id)]);
      setSelectedDraftId(document.id);
      setFields([DEFAULT_FIELD(0)]);
      setTitleDraft("");
      setDirty(true);
      toast.success(
        selectedCreateFile && !isPdfAttachment(selectedCreateFile)
          ? "Template created. DOC/DOCX will be converted to PDF for placement."
          : "Template created. Add fields and click Save Template."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create draft.");
    } finally {
      setCreating(false);
    }
  };

  const downloadFlattenedPdf = async () => {
    if (!selectedDraft) {
      toast.error("Open a template with PDF preview first.");
      return;
    }
    setDownloadingPdf(true);
    try {
      const base = getApiBaseUrl();
      if (!base) throw new Error("VITE_API_URL is not set.");
      const renderId = selectedDraft.renderFileId ?? selectedDraft.originalFileId;
      const downloadUrl = `${base}/api/projects/${encodeURIComponent(projectId)}/stored-files/${encodeURIComponent(renderId)}/download`;
      const sourceResp = await authFetch(downloadUrl);
      if (!sourceResp.ok) throw new Error("Could not load source PDF for export.");
      const sourceBuf = await sourceResp.arrayBuffer();
      const loadingTask = getDocument({ data: new Uint8Array(sourceBuf) });
      const pdf = await loadingTask.promise;
      let vendorSignatureImage: HTMLImageElement | null = null;
      if (vendorSignatureObjectUrl) {
        vendorSignatureImage = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Could not load vendor signature image."));
          img.src = vendorSignatureObjectUrl;
        });
      }

      let out: jsPDF | null = null;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const width = viewport.width;
        const height = viewport.height;

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvas: canvas as any, canvasContext: ctx, viewport }).promise;

        const pageFields = fields.filter((f) => f.pageNumber === pageNumber);
        for (const field of pageFields) {
          const x = field.x;
          const y = field.y;
          const w = field.width;
          const h = field.height;
          if (field.fieldType === "signature" && field.role === "vendor" && vendorSignatureImage) {
            ctx.drawImage(vendorSignatureImage, x, y, w, h);
            continue;
          }
          ctx.save();
          ctx.lineWidth = 1;
          ctx.strokeStyle = field.role === "vendor" ? "#3b82f6" : "#059669";
          ctx.fillStyle = field.role === "vendor" ? "rgba(59,130,246,0.12)" : "rgba(5,150,105,0.12)";
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = field.role === "vendor" ? "#1d4ed8" : "#047857";
          ctx.font = "10px sans-serif";
          ctx.textBaseline = "middle";
          const label = field.fieldType === "signature" ? `${field.role} signature` : `${field.fieldType} · ${field.role}`;
          ctx.fillText(label, x + 6, y + h / 2);
          ctx.restore();
        }

        if (!out) {
          out = new jsPDF({
            orientation: width >= height ? "landscape" : "portrait",
            unit: "pt",
            format: [width, height],
          });
        } else {
          out.addPage([width, height], width >= height ? "landscape" : "portrait");
        }
        const imageData = canvas.toDataURL("image/png");
        out.addImage(imageData, "PNG", 0, 0, width, height, undefined, "FAST");
      }

      if (!out) throw new Error("No pages found to export.");
      const safeTitle = (selectedDraft.title || "template").replace(/[\\/:*?\"<>|]+/g, "_");
      out.save(`${safeTitle}-with-fields.pdf`);
      toast.success("Downloaded template PDF with fields.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const saveNow = async () => {
    if (!selectedDraftId) return;
    setSaving(true);
    try {
      await saveEsignDocumentApi(projectId, selectedDraftId, { fields, autosave: false });
      setDirty(false);
      await refreshList();
      try {
        const data = await getEsignDocumentApi(projectId, selectedDraftId);
        setFields(data.fields ?? []);
      } catch {
        /* list already refreshed; fields stay local */
      }
      toast.success("Template saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save draft.");
    } finally {
      setSaving(false);
    }
  };

  const markReady = async () => {
    if (!selectedDraftId) return;
    try {
      await saveNow();
      await markEsignDocumentReadyApi(projectId, selectedDraftId);
      await refreshList();
      toast.success("Template marked ready for send.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark draft ready.");
    }
  };

  const downloadSignedDocusignPdf = async () => {
    const fileId = selectedDraft?.signedStoredFileId?.trim();
    if (!fileId) {
      toast.error("Signed file is not available yet.");
      return;
    }
    const base = getApiBaseUrl();
    if (!base) {
      toast.error("VITE_API_URL is not set.");
      return;
    }
    setDownloadingSignedPdf(true);
    try {
      const url = `${base}/api/projects/${encodeURIComponent(projectId)}/stored-files/${encodeURIComponent(fileId)}/download`;
      const response = await authFetch(url);
      if (!response.ok) throw new Error("Could not download signed PDF.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${(selectedDraft?.title || "signed").replace(/[\\/:*?"<>|]+/g, "_")}-docusign.pdf`;
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast.success("Download started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed.");
    } finally {
      setDownloadingSignedPdf(false);
    }
  };

  const syncDocuSignCompletion = async () => {
    if (!selectedDraftId) return;
    setSyncingDocuSign(true);
    try {
      const result = await syncDocusignCompletionApi(projectId, selectedDraftId);
      await refreshList();
      if (result.imported) {
        toast.success(`Imported signed PDF from DocuSign (status: ${result.docusignStatus}).`);
      } else if (result.signedStoredFileId) {
        toast.success("Signed PDF is already in this project.");
      } else {
        toast.message(`DocuSign status: ${result.docusignStatus}. Not completed yet, or already imported.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sync with DocuSign.");
    } finally {
      setSyncingDocuSign(false);
    }
  };

  const sendDocusignFromBuilder = async () => {
    if (!selectedDraftId) return;
    const parsed = parseSignerEmailsFromInput(clientSendEmail);
    if (parsed.length === 0) {
      toast.error(
        "Enter at least one valid email. Use comma, semicolon, or newline between addresses; only the first address signs (others are carbon copies)."
      );
      return;
    }
    const strict = validateSignerEmailListForDocuSign(parsed);
    if (strict.ok === false) {
      toast.error(strict.message);
      return;
    }
    setSendingEnvelope(true);
    try {
      await sendEsignDocusignApi(projectId, selectedDraftId, { clientEmail: clientSendEmail.trim() });
      await refreshList();
      onEnvelopeSent?.();
      const ccNote = parsed.length > 1 ? ` ${parsed.length - 1} carbon copy recipient(s) also notified.` : "";
      toast.success(`DocuSign envelope sent to ${parsed[0]}.${ccNote} Only the first address signs; vendor signature is already on the PDF.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send DocuSign envelope.");
    } finally {
      setSendingEnvelope(false);
    }
  };

  const deleteSelectedDraft = async () => {
    if (!selectedDraftId) return;
    if (selectedDraft && ESIGN_DELETE_BLOCKED_STATUSES.has(selectedDraft.status)) {
      toast.error("Sent or completed templates cannot be deleted.");
      return;
    }
    if (!(await confirm(deleteTemplateConfirmOptions(selectedDraft?.title ?? "")))) {
      return;
    }
    const draftId = selectedDraftId;
    const ownerProjectId = selectedDraft?.projectId ?? projectId;
    setSelectedDraftId("");
    setFields([]);
    setPdfBytes(null);
    try {
      await deleteEsignDocumentApi(ownerProjectId, draftId);
      setDocuments((prev) => prev.filter((d) => d.id !== draftId));
      appToast({ title: "Template deleted." });
    } catch (error) {
      if (isNotFoundError(error)) {
        setDocuments((prev) => prev.filter((d) => d.id !== draftId));
        appToast({ title: "Template already removed." });
        return;
      }
      toast.error(error instanceof Error ? error.message : "Could not delete template.");
    }
  };

  const saveStateLabel = dirty ? "Unsaved changes" : "Saved";

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[980px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>E-sign Template Builder</SheetTitle>
          <SheetDescription>
            Place vendor and client fields on the PDF. Vendor uses your SMTP signature image (burned into the file for DocuSign); only the client receives a DocuSign signing email.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {!isEditingExistingEntry && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="text-sm font-medium">Create New Template</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="Template title" />
                <Select
                  value={storedFileIdDraft || undefined}
                  onValueChange={setStoredFileIdDraft}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select uploaded file" />
                  </SelectTrigger>
                  <SelectContent>
                    {attachments.map((file) => (
                      <SelectItem key={file.id} value={file.id}>
                        {file.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={projectDocumentIdDraft} onValueChange={setProjectDocumentIdDraft}>
                  <SelectTrigger>
                    <SelectValue placeholder="Checklist doc (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No checklist link</SelectItem>
                    {docs.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createDraft} disabled={creating}>
                <Plus className="w-4 h-4 mr-1" /> {creating ? "Creating..." : "Create Template"}
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Open Existing Template</div>
              <div className="text-xs text-muted-foreground">{loadingList ? "Loading..." : `${documents.length} template(s)`}</div>
            </div>
            <Select
              value={selectedDraftId || undefined}
              onValueChange={setSelectedDraftId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title} · {doc.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">{saveStateLabel}</div>
            {!selectedDraftId && !loadingList ? (
              <p className="text-xs text-muted-foreground">
                No template selected. Create a new template above or pick one from the list.
              </p>
            ) : null}
          </div>

          {selectedDraft && (
            <>
              {!selectedDraft.renderFileId && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  This template is waiting for PDF conversion. If it stays stuck, ensure LibreOffice (soffice) is installed on the server.
                </div>
              )}
              <div className="rounded-lg border border-border p-3 space-y-2">
                {smtpSettings && (
                  <div className="text-xs text-muted-foreground">
                    Vendor signer: {smtpSettings.fromName?.trim() || "—"} · {smtpSettings.fromEmail?.trim() || "—"} ·{" "}
                    {smtpSettings.vendorSignatureFileId ? "Signature: uploaded" : "Signature: missing"}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">PDF Preview (pdf.js)</div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPdfScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(2))))}>
                      -
                    </Button>
                    <div className="text-xs text-muted-foreground">{Math.round(pdfScale * 100)}%</div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPdfScale((s) => Math.min(2.0, Number((s + 0.1).toFixed(2))))}>
                      +
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-muted/30 p-2 max-h-[520px] overflow-y-auto">
                  {previewLoading && <div className="py-8 text-sm text-muted-foreground text-center">Loading preview…</div>}
                  {!previewLoading && !pdfBytes && (
                    <div className="py-8 text-sm text-muted-foreground text-center">Preview unavailable.</div>
                  )}
                  {pdfBytes && (
                    <PdfJsViewer
                      fileData={pdfBytes}
                      scale={pdfScale}
                      renderOverlays={({ pageNumber }) => (
                        <div className="absolute inset-0 pointer-events-none">
                          {fields.map((field, index) =>
                            field.pageNumber !== pageNumber ? null : (
                              <button
                                key={`${field.id ?? "new"}-drag-${pageNumber}-${index}`}
                                type="button"
                                className={`absolute rounded border text-[10px] px-1 py-0.5 pointer-events-auto ${
                                  field.role === "vendor"
                                    ? "bg-blue-500/20 border-blue-500 text-blue-700"
                                    : "bg-emerald-500/20 border-emerald-600 text-emerald-700"
                                }`}
                                style={{
                                  left: `${toPx(field.x)}px`,
                                  top: `${toPx(field.y)}px`,
                                  width: `${toPx(field.width)}px`,
                                  height: `${toPx(field.height)}px`,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  draggingRef.current = { index };
                                }}
                                title="Drag to reposition"
                              >
                                {field.fieldType === "signature" && field.role === "vendor" && vendorSignatureObjectUrl ? (
                                  <img
                                    src={vendorSignatureObjectUrl}
                                    alt="Vendor signature"
                                    className="w-full h-full object-contain pointer-events-none"
                                    draggable={false}
                                  />
                                ) : (
                                  `${field.fieldType} · ${field.role}`
                                )}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="text-xs text-muted-foreground">
                  Vendor preview uses the signature image from Email / SMTP settings. Only the client signs in DocuSign; client email is set when you send the envelope.
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Fields</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFields((prev) => [...prev, DEFAULT_FIELD(prev.length)]);
                      setDirty(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Field
                  </Button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={`${field.id ?? "new"}-${index}`} className="grid grid-cols-12 gap-2">
                      <Select
                        value={field.fieldType}
                        onValueChange={(value: EsignFieldDto["fieldType"]) => {
                          const next = [...fields];
                          next[index] = { ...next[index], fieldType: value };
                          setFields(next);
                          setDirty(true);
                        }}
                      >
                        <SelectTrigger className="col-span-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="signature">signature</SelectItem>
                          <SelectItem value="initials">initials</SelectItem>
                          <SelectItem value="text">text</SelectItem>
                          <SelectItem value="date">date</SelectItem>
                          <SelectItem value="checkbox">checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={field.role}
                        onValueChange={(value: "vendor" | "client") => {
                          const next = [...fields];
                          next[index] = { ...next[index], role: value };
                          setFields(next);
                          setDirty(true);
                        }}
                      >
                        <SelectTrigger className="col-span-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vendor">vendor</SelectItem>
                          <SelectItem value="client">client</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="col-span-1"
                        type="number"
                        min={1}
                        value={field.pageNumber}
                        onChange={(e) => {
                          const next = [...fields];
                          next[index] = { ...next[index], pageNumber: Number(e.target.value || 1) };
                          setFields(next);
                          setDirty(true);
                        }}
                      />
                      <Input
                        className="col-span-1"
                        type="number"
                        value={field.x}
                        onChange={(e) => {
                          const next = [...fields];
                          next[index] = { ...next[index], x: Number(e.target.value || 0) };
                          setFields(next);
                          setDirty(true);
                        }}
                      />
                      <Input
                        className="col-span-1"
                        type="number"
                        value={field.y}
                        onChange={(e) => {
                          const next = [...fields];
                          next[index] = { ...next[index], y: Number(e.target.value || 0) };
                          setFields(next);
                          setDirty(true);
                        }}
                      />
                      <Input
                        className="col-span-1"
                        type="number"
                        value={field.width}
                        onChange={(e) => {
                          const next = [...fields];
                          next[index] = { ...next[index], width: Number(e.target.value || 0) };
                          setFields(next);
                          setDirty(true);
                        }}
                      />
                      <Input
                        className="col-span-1"
                        type="number"
                        value={field.height}
                        onChange={(e) => {
                          const next = [...fields];
                          next[index] = { ...next[index], height: Number(e.target.value || 0) };
                          setFields(next);
                          setDirty(true);
                        }}
                      />
                      <Input
                        className="col-span-2"
                        placeholder="Label"
                        value={field.label ?? ""}
                        onChange={(e) => {
                          const next = [...fields];
                          next[index] = { ...next[index], label: e.target.value };
                          setFields(next);
                          setDirty(true);
                        }}
                      />
                      <div className="col-span-1 flex items-center justify-end gap-1">
                        <Checkbox
                          checked={field.required}
                          onCheckedChange={(checked) => {
                            const next = [...fields];
                            next[index] = { ...next[index], required: checked === true };
                            setFields(next);
                            setDirty(true);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFields((prev) => prev.filter((_, i) => i !== index));
                            setDirty(true);
                          }}
                          title="Remove field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDraft.signedStoredFileId ? (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="text-sm font-medium">Last signed PDF (DocuSign)</div>
                  <p className="text-xs text-muted-foreground">
                    From the most recently completed envelope for this template. You can send again with the section below; each send creates a new
                    DocuSign envelope.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={downloadingSignedPdf}
                    onClick={() => void downloadSignedDocusignPdf()}
                  >
                    <Download className="w-4 h-4" /> {downloadingSignedPdf ? "Downloading…" : "Download signed PDF"}
                  </Button>
                </div>
              ) : null}

              {(selectedDraft.status === "ready_for_send" || selectedDraft.status === "completed") && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="text-sm font-medium">Send with DocuSign</div>
                  <p className="text-xs text-muted-foreground">
                    First email is the only signer (client). Additional addresses separated by comma, semicolon, or newline are DocuSign carbon copies
                    (not signers). Vendor signature is merged from SMTP settings into the PDF first. Configure Connect to{" "}
                    <code className="text-[11px]">POST /api/docusign/connect</code> on a public URL so completed envelopes import into this project.
                    Templates stay reusable after each completed envelope.
                  </p>
                  {recipientEmailSuggestions.length > 0 ? (
                    <Select value={clientSendEmailSelectValue} onValueChange={(v) => setClientSendEmail(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose signer from this transaction…" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipientEmailSuggestions.map((row) => (
                          <SelectItem key={row.email} value={row.email}>
                            <span className="font-medium">{row.label}</span>
                            <span className="text-muted-foreground"> · {row.email}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder="Signer email (comma / newline for CC copies)"
                    value={clientSendEmail}
                    onChange={(e) => setClientSendEmail(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Quick pick lists contact, parties on the file (buyers, sellers, agents, escrow, TCs), and assigned team; you can still type any address.
                  </p>
                  <Button type="button" className="gap-2" disabled={sendingEnvelope} onClick={() => void sendDocusignFromBuilder()}>
                    <Send className="w-4 h-4" /> {sendingEnvelope ? "Sending…" : "Send envelope"}
                  </Button>
                </div>
              )}
              {selectedDraft.status === "sent" && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="text-xs text-muted-foreground break-words">
                    Envelope sent. If DocuSign Connect cannot reach your API (e.g. localhost), status stays &quot;sent&quot; until you pull the
                    result from DocuSign. Use <strong>Import signed PDF from DocuSign</strong> after the client finishes signing. With a public
                    server, Connect can POST to <code className="text-[11px] break-all">/api/docusign/connect</code> instead.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={loadingList} onClick={() => void refreshList()}>
                      Refresh template status
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1"
                      disabled={syncingDocuSign}
                      onClick={() => void syncDocuSignCompletion()}
                    >
                      <CloudDownload className="w-4 h-4" />
                      {syncingDocuSign ? "Importing…" : "Import signed PDF from DocuSign"}
                    </Button>
                  </div>
                </div>
              )}
              {selectedDraft.status === "completed" && !selectedDraft.signedStoredFileId && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="text-sm font-medium">Signed PDF (DocuSign)</div>
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 break-words">
                    No signed file in the CRM yet (Connect may not have reached your server). Click below to fetch status from DocuSign and import
                    the combined PDF if the envelope is completed.
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="gap-1"
                    disabled={syncingDocuSign}
                    onClick={() => void syncDocuSignCompletion()}
                  >
                    <CloudDownload className="w-4 h-4" />
                    {syncingDocuSign ? "Importing…" : "Import signed PDF from DocuSign"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="mt-6">
          <div className="flex w-full items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={downloadFlattenedPdf} disabled={!selectedDraftId || downloadingPdf || previewLoading}>
              <Download className="w-4 h-4 mr-1" /> {downloadingPdf ? "Downloading..." : "Download PDF"}
            </Button>
            <Button onClick={saveNow} disabled={!selectedDraftId || saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : isEditingExistingEntry ? "Update Template" : "Save Template"}
            </Button>
            <Button onClick={markReady} disabled={!selectedDraftId}>
              <ShieldCheck className="w-4 h-4 mr-1" /> Mark Ready
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelectedDraft}
              disabled={!canDeleteSelectedDraft}
              title={
                selectedDraft && ESIGN_DELETE_BLOCKED_STATUSES.has(selectedDraft.status)
                  ? "Sent or completed templates cannot be deleted."
                  : undefined
              }
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete Template
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    <ConfirmDialogHost />
    </>
  );
}
