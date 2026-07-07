import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  FileText,
  Upload,
  Plus,
  Send,
  Paperclip,
  Download,
  Trash2,
  ExternalLink,
  X,
  CloudDownload,
  Folder,
  MoreHorizontal,
  Pencil,
  ChevronRight,
} from "lucide-react";
import DocumentChecklistNotesPopover from "@/components/documents/DocumentChecklistNotesPopover";
import DocumentChecklistNotesPreview from "@/components/documents/DocumentChecklistNotesPreview";
import DocumentChecklistRowCard from "@/components/documents/DocumentChecklistRowCard";
import type { DocumentChecklistRow } from "@/components/documents/documentChecklistTypes";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { DOC_STATUS_PRESETS, CRM_DOCUMENT_VAULT_PROJECT_ID, type DocumentStatus, type FileAttachment } from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { authFetch } from "@/lib/authFetch";
import { parseSignerEmailsFromInput, validateSignerEmailListForDocuSign } from "@/lib/parseClientSignerEmails";
import { getTransactionRecipientSuggestions } from "@/lib/transactionRecipientSuggestions";
import {
  listProjectStoredFiles,
  uploadProjectStoredFile,
  deleteProjectStoredFile,
  deleteProjectFileFolder,
  patchProjectStoredFileFolder,
  patchProjectStoredFile,
  createProjectFileFolder,
  ApiRequestError,
} from "@/api/storedFiles";
import {
  createProjectDocumentNoteApi,
  updateProjectDocumentNoteApi,
  deleteProjectDocumentNoteApi,
  deleteProjectDocumentApi,
  getProjectFromApi,
  patchProjectDocumentStatusApi,
} from "@/api/projects";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { documentChecklistSummary, checklistDocNameClass, checklistRowClass, isChecklistDocNa } from "@/lib/documentChecklistUtils";
import {
  listPagePanelClass,
  embeddedTabBodyClass,
  embeddedTabFillClass,
  embeddedTabOverflowHiddenClass,
  embeddedTabScrollClass,
  embeddedTabShellClass,
  transactionDetailTabShellClass,
} from "@/lib/listPageLayout";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasPermission } from "@/lib/permissions";
import EsignDraftSheet from "@/components/documents/EsignDraftSheet";
import { deleteTemplateConfirmOptions, useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  deleteEsignDocumentApi,
  deleteEsignDraftsByFileApi,
  listEsignDocumentsApi,
  patchEsignDocumentTitleApi,
  sendEsignDocusignApi,
  syncDocusignCompletionApi,
  type EsignDocumentDto,
  type SendEsignDocusignResult,
} from "@/api/esign";
import type { ProjectFolder } from "@/types/domain";

export type TransactionDocumentsView = "checklist-only" | "pool-only" | "full";

const POOL_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Selected folder and all nested subfolder ids (sidebar tree totals). */
function folderScopeIds(folderId: string, folders: ProjectFolder[]): Set<string> {
  const ids = new Set<string>([folderId]);
  for (const child of folders) {
    if (child.parentId === folderId) {
      for (const id of folderScopeIds(child.id, folders)) {
        ids.add(id);
      }
    }
  }
  return ids;
}

function countInFolderScope(
  folderId: string,
  folders: ProjectFolder[],
  fileFolderIds: Array<string | null | undefined>,
): number {
  const scope = folderScopeIds(folderId, folders);
  return fileFolderIds.filter((id) => id != null && scope.has(id)).length;
}

function countInExactFolder(
  folderId: string,
  fileFolderIds: Array<string | null | undefined>,
): number {
  return fileFolderIds.filter((id) => id === folderId).length;
}

function esignStatusLabel(status: EsignDocumentDto["status"]): string {
  switch (status) {
    case "draft_uploaded":
      return "Draft uploaded";
    case "editing":
      return "Editing";
    case "ready_for_send":
      return "Ready to send";
    case "conversion_failed":
      return "Conversion failed";
    case "sent":
      return "Sent";
    case "completed":
      return "Completed";
    case "declined":
      return "Declined";
    case "voided":
      return "Voided";
    default:
      return status;
  }
}

type DocRow = DocumentChecklistRow;

export interface TransactionDocumentsWorkspaceProps {
  projectId: string;
  view: TransactionDocumentsView;
  allowPoolUpload?: boolean;
  /** Constrain height + inner scroll when rendered inside transaction detail tabs. */
  embeddedInTransactionTab?: boolean;
  /** Constrain height + inner scroll on the standalone Documents hub (lg+). */
  boundedPoolScroll?: boolean;
}

export default function TransactionDocumentsWorkspace({
  projectId,
  view,
  allowPoolUpload = true,
  embeddedInTransactionTab = false,
  boundedPoolScroll = false,
}: TransactionDocumentsWorkspaceProps) {
  const poolLayoutBounded = embeddedInTransactionTab || boundedPoolScroll;
  const project = useAppStore((s) => s.projects.find((p) => p.id === projectId));
  const client = useAppStore((s) => s.clients.find((c) => c.id === project?.clientId));
  const user = useAuthStore((s) => s.user);

  const docuSignRecipientSuggestions = useMemo(
    () => getTransactionRecipientSuggestions(project ?? null, client ?? null),
    [project, client],
  );

  const setDocStatusStore = useAppStore((s) => s.setDocStatus);
  const bulkSetDocStatusStore = useAppStore((s) => s.bulkSetDocStatus);
  const addStoredFileToPoolStore = useAppStore((s) => s.addStoredFileToPool);
  const deleteStoredFileStore = useAppStore((s) => s.deleteStoredFile);
  const moveStoredFileToFolderStore = useAppStore((s) => s.moveStoredFileToFolder);
  const renameStoredFileInPoolStore = useAppStore((s) => s.renameStoredFileInPool);
  const addProjectFileFolderStore = useAppStore((s) => s.addProjectFileFolder);
  const removeProjectFileFolderStore = useAppStore((s) => s.removeProjectFileFolder);
  const attachStoredFilesToDocumentStore = useAppStore((s) => s.attachStoredFilesToDocument);
  const detachStoredFileFromDocumentStore = useAppStore((s) => s.detachStoredFileFromDocument);
  const uploadFileToDocumentStore = useAppStore((s) => s.uploadFileToDocument);
  const hydrateProjectFilePoolStore = useAppStore((s) => s.hydrateProjectFilePool);
  const appendProjectAttachmentsStore = useAppStore((s) => s.appendProjectAttachments);
  const upsertProject = useAppStore((s) => s.upsertProject);
  const { confirm, ConfirmDialogHost } = useConfirmDialog();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<DocumentStatus | "">("");
  const [attachDocId, setAttachDocId] = useState<string | null>(null);
  const [attachPick, setAttachPick] = useState<Set<string>>(new Set());

  const [storageScope, setStorageScope] = useState<"all" | "inbox" | string>("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [folderCreateMode, setFolderCreateMode] = useState<
    { kind: "parent" } | { kind: "subfolder"; parentId: string } | null
  >(null);

  const poolFileInputRef = useRef<HTMLInputElement>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);
  const checklistUploadDocIdRef = useRef<string | null>(null);

  const [docuSignOpen, setDocuSignOpen] = useState(false);
  const [esignOpen, setEsignOpen] = useState(false);
  const [esignPrefill, setEsignPrefill] = useState<{ fileId: string; title: string; key: number } | null>(null);
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);
  const [esignDrafts, setEsignDrafts] = useState<EsignDocumentDto[]>([]);
  const [docuSignDocs, setDocuSignDocs] = useState<DocRow[]>([]);
  const [docuSignRecipient, setDocuSignRecipient] = useState("");
  const docuSignRecipientSelectValue = useMemo(() => {
    const parsed = parseSignerEmailsFromInput(docuSignRecipient);
    if (parsed.length !== 1) return undefined;
    const lower = parsed[0].toLowerCase();
    const hit = docuSignRecipientSuggestions.find((s) => s.email.toLowerCase() === lower);
    return hit ? hit.email : undefined;
  }, [docuSignRecipient, docuSignRecipientSuggestions]);
  const [pullingEsignForDocId, setPullingEsignForDocId] = useState<string | null>(null);
  const [docNoteDrafts, setDocNoteDrafts] = useState<Record<string, string>>({});
  const [savingDocNoteId, setSavingDocNoteId] = useState<string | null>(null);
  const [editingDocNote, setEditingDocNote] = useState<{ docId: string; noteId: string } | null>(null);
  const [editDocNoteBody, setEditDocNoteBody] = useState("");
  const [docNoteActionKey, setDocNoteActionKey] = useState<string | null>(null);
  const [openNotesDocId, setOpenNotesDocId] = useState<string | null>(null);
  const [poolAccessDenied, setPoolAccessDenied] = useState(false);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renamingTemplateId, setRenamingTemplateId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const canViewDocs = hasPermission(user, "documents.view");
  const canUploadDocs = hasPermission(user, "documents.upload");
  const canMoveDocs = hasPermission(user, "documents.move");
  const canDeleteDocs = hasPermission(user, "documents.delete");
  const canDownloadDocs = hasPermission(user, "documents.download");
  const canCreateFolders = hasPermission(user, "documents.folders.create");
  const canDeleteFolders = hasPermission(user, "documents.folders.delete");

  const docs: DocRow[] = useMemo(
    () =>
      (project?.documents || []).map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        customStatus: (d as { customStatus?: string }).customStatus,
        required: d.required,
        sourceRuleId: (d as { sourceRuleId?: string }).sourceRuleId,
        sourceRuleActionId: (d as { sourceRuleActionId?: string }).sourceRuleActionId,
        esignDocumentId: (d as { esignDocumentId?: string }).esignDocumentId,
        notesCount: (d.notes ?? []).length,
        notes: (d.notes ?? []).map((n, index) => ({
          id: n.id ?? `legacy-${d.id}-${index}`,
          date: n.date,
          text: n.text,
          author: n.author,
          ...(n.updatedAt ? { updatedAt: n.updatedAt } : {}),
        })),
        attachedFileIds: d.attachedFileIds ?? [],
      })),
    [project]
  );

  const checklistSummary = useMemo(() => documentChecklistSummary(docs), [docs]);

  const fileFolders = project?.fileFolders ?? [];

  const scopedStorageFolder = useMemo(
    () => (storageScope === "all" || storageScope === "inbox" ? null : fileFolders.find((f) => f.id === storageScope) ?? null),
    [storageScope, fileFolders],
  );

  const storageScopeChildFolders = useMemo(
    () =>
      storageScope === "all" || storageScope === "inbox"
        ? []
        : fileFolders.filter((f) => f.parentId === storageScope),
    [storageScope, fileFolders],
  );

  const storageBreadcrumb = useMemo(() => {
    if (!scopedStorageFolder) return [];
    const crumbs: ProjectFolder[] = [];
    let current: ProjectFolder | undefined = scopedStorageFolder;
    while (current) {
      crumbs.unshift(current);
      current = current.parentId ? fileFolders.find((f) => f.id === current!.parentId) : undefined;
    }
    return crumbs;
  }, [scopedStorageFolder, fileFolders]);

  const filteredPoolFiles = useMemo(() => {
    if (!project?.attachments) return [];
    if (storageScope === "all") return project.attachments;
    if (storageScope === "inbox") return project.attachments.filter((a) => a.folderId == null);
    return project.attachments.filter((a) => a.folderId === storageScope);
  }, [project, storageScope]);

  const unfiledCount = useMemo(
    () => project?.attachments.filter((a) => a.folderId == null).length ?? 0,
    [project],
  );

  const attachmentById = useMemo(() => {
    const map = new Map<string, FileAttachment>();
    for (const file of project?.attachments ?? []) map.set(file.id, file);
    return map;
  }, [project?.attachments]);

  const poolListsTemplates = view === "pool-only";

  const folderIdForDraft = useCallback(
    (draft: EsignDocumentDto): string | null => attachmentById.get(draft.originalFileId)?.folderId ?? null,
    [attachmentById],
  );

  const filteredEsignDrafts = useMemo(() => {
    if (!poolListsTemplates) return esignDrafts;
    if (storageScope === "all") return esignDrafts;
    if (storageScope === "inbox") return esignDrafts.filter((draft) => folderIdForDraft(draft) == null);
    return esignDrafts.filter((draft) => folderIdForDraft(draft) === storageScope);
  }, [poolListsTemplates, esignDrafts, storageScope, folderIdForDraft]);

  const countTemplatesInFolderScope = useCallback(
    (folderId: string) =>
      countInFolderScope(
        folderId,
        fileFolders,
        esignDrafts.map((draft) => folderIdForDraft(draft)),
      ),
    [fileFolders, esignDrafts, folderIdForDraft],
  );

  const countFilesInFolderScope = useCallback(
    (folderId: string) =>
      countInFolderScope(
        folderId,
        fileFolders,
        (project?.attachments ?? []).map((file) => file.folderId),
      ),
    [fileFolders, project?.attachments],
  );

  const countItemsInExactFolder = useCallback(
    (folderId: string) =>
      poolListsTemplates
        ? countInExactFolder(
            folderId,
            esignDrafts.map((draft) => folderIdForDraft(draft)),
          )
        : countInExactFolder(
            folderId,
            (project?.attachments ?? []).map((file) => file.folderId),
          ),
    [poolListsTemplates, esignDrafts, folderIdForDraft, project?.attachments],
  );

  const templateUnfiledCount = useMemo(
    () => esignDrafts.filter((draft) => folderIdForDraft(draft) == null).length,
    [esignDrafts, folderIdForDraft],
  );

  const poolScopeCount = poolListsTemplates ? filteredEsignDrafts.length : filteredPoolFiles.length;
  const poolTotalCount = poolListsTemplates ? esignDrafts.length : (project?.attachments.length ?? 0);

  const attachTargetDoc = useMemo(() => docs.find((d) => d.id === attachDocId), [docs, attachDocId]);

  const loadMergedEsignDrafts = useCallback(async (): Promise<EsignDocumentDto[]> => {
    if (!getApiBaseUrl()) return [];
    let local: EsignDocumentDto[];
    try {
      local = await listEsignDocumentsApi(projectId);
    } catch {
      return [];
    }
    if (projectId === CRM_DOCUMENT_VAULT_PROJECT_ID) return local;
    try {
      const vault = await listEsignDocumentsApi(CRM_DOCUMENT_VAULT_PROJECT_ID);
      const byId = new Map<string, EsignDocumentDto>();
      for (const d of vault) byId.set(d.id, d);
      for (const d of local) byId.set(d.id, d);
      return Array.from(byId.values());
    } catch {
      return local;
    }
  }, [projectId]);

  const downloadPoolFile = useCallback(async (file: FileAttachment) => {
    if (!canDownloadDocs) {
      toast.error("You do not have permission to download files.");
      return;
    }
    if (file.localObjectUrl) {
      const a = document.createElement("a");
      a.href = file.localObjectUrl;
      a.download = file.name;
      a.click();
      return;
    }
    if (file.downloadUrl) {
      const url = file.downloadUrl;
      let path = "";
      try {
        path = new URL(url).pathname;
      } catch {
        path = "";
      }
      const isProtectedStoredDownload =
        Boolean(getApiBaseUrl()) &&
        /\/api\/projects\/[^/]+\/stored-files\/[^/]+\/download$/.test(path);

      if (isProtectedStoredDownload) {
        try {
          const res = await authFetch(url);
          if (!res.ok) {
            let msg = `Download failed (${res.status}).`;
            try {
              const j = (await res.json()) as { error?: { message?: string } };
              if (j?.error?.message) msg = j.error.message;
            } catch {
              /* ignore non-JSON body */
            }
            toast.error(msg);
            return;
          }
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(objectUrl);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Download failed.");
        }
        return;
      }

      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = file.name;
      a.click();
      return;
    }
    toast.message("Demo file", {
      description: "This file is seed data only until the server stores binaries.",
    });
  }, [canDownloadDocs]);

  const showChecklist = view !== "pool-only";
  const showPool = view !== "checklist-only";

  /* Load stored-file metadata whenever this workspace is shown (checklist-only, pool-only, or full).
   * Checklist-only used to skip this because showPool was false — then attachments stayed empty and
   * checklist download looked up IDs against an empty pool ("No linked file to download"). */
  useEffect(() => {
    if (!showChecklist && !showPool) return;
    if (!getApiBaseUrl()) return;
    let cancelled = false;
    (async () => {
      try {
        const { attachments, fileFolders } = await listProjectStoredFiles(projectId);
        if (!cancelled) {
          setPoolAccessDenied(false);
          hydrateProjectFilePoolStore(projectId, { attachments, fileFolders });
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiRequestError && err.status === 403) {
            setPoolAccessDenied(true);
            toast.error("You do not have permission to view documents.");
          } else {
            setPoolAccessDenied(false);
            toast.message("Could not load file pool from server", {
              description: "Using in-app data until the API is reachable.",
            });
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, showChecklist, showPool, hydrateProjectFilePoolStore]);

  useEffect(() => {
    if (!getApiBaseUrl()) return;
    let cancelled = false;
    void loadMergedEsignDrafts().then((merged) => {
      if (!cancelled) setEsignDrafts(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, esignOpen, loadMergedEsignDrafts]);

  const shouldPollEsign = useMemo(() => esignDrafts.some((d) => d.status === "sent"), [esignDrafts]);

  useEffect(() => {
    if (!getApiBaseUrl() || !shouldPollEsign) return;
    const id = window.setInterval(() => {
      void loadMergedEsignDrafts().then((merged) => setEsignDrafts(merged));
    }, 12_000);
    return () => window.clearInterval(id);
  }, [projectId, shouldPollEsign, loadMergedEsignDrafts]);

  const esignStatusRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!getApiBaseUrl()) return;
    for (const d of esignDrafts) {
      const prev = esignStatusRef.current[d.id];
      if (prev === "sent" && (d.status === "ready_for_send" || d.status === "completed")) {
        void getProjectFromApi(projectId)
          .then((p) => upsertProject(p))
          .catch(() => {});
      }
      esignStatusRef.current[d.id] = d.status;
    }
  }, [esignDrafts, projectId, upsertProject]);

  useEffect(() => {
    if (folderCreateMode?.kind !== "subfolder") return;
    const folders = project?.fileFolders ?? [];
    const active =
      storageScope === "all" || storageScope === "inbox"
        ? null
        : folders.find((f) => f.id === storageScope);
    if (!active || active.parentId != null || active.id !== folderCreateMode.parentId) {
      setNewFolderName("");
      setFolderCreateMode(null);
    }
  }, [storageScope, folderCreateMode, project?.fileFolders]);

  if (!project) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Transaction not found.
      </div>
    );
  }

  const folders = project.fileFolders ?? [];
  const activeStorageFolder =
    storageScope === "all" || storageScope === "inbox"
      ? null
      : (folders.find((f) => f.id === storageScope) ?? null);
  const canCreateSubfolderHere = activeStorageFolder != null && activeStorageFolder.parentId == null;

  const updateDocStatus = (docId: string, status: DocumentStatus, customStatus?: string) => {
    if (!getApiBaseUrl()) {
      setDocStatusStore(project.id, docId, status, customStatus);
      return;
    }
    void patchProjectDocumentStatusApi(project.id, docId, status, customStatus)
      .then((updated) => {
        upsertProject(updated);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not update document status.");
      });
  };

  const saveDocumentNote = (doc: DocRow) => {
    const body = (docNoteDrafts[doc.id] ?? "").trim();
    if (!body) {
      toast.error("Note text is required.");
      return;
    }
    if (!getApiBaseUrl()) {
      const localNote = {
        id: `n-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        text: body,
        author: user?.name ?? "Kathryn",
      };
      const nextDocuments = (project.documents ?? []).map((d) =>
        d.id === doc.id ? { ...d, notes: [localNote, ...(d.notes ?? [])] } : d
      );
      upsertProject({ ...project, documents: nextDocuments });
      setDocNoteDrafts((prev) => ({ ...prev, [doc.id]: "" }));
      toast.success("Note added.");
      return;
    }
    setSavingDocNoteId(doc.id);
    void createProjectDocumentNoteApi(project.id, doc.id, body)
      .then((updated) => {
        upsertProject(updated);
        setDocNoteDrafts((prev) => ({ ...prev, [doc.id]: "" }));
        toast.success("Note added.");
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not add note.");
      })
      .finally(() => setSavingDocNoteId(null));
  };

  const cancelEditDocumentNote = () => {
    setEditingDocNote(null);
    setEditDocNoteBody("");
  };

  const startEditDocumentNote = (docId: string, note: DocRow["notes"][number]) => {
    setEditingDocNote({ docId, noteId: note.id });
    setEditDocNoteBody(note.text);
  };

  const updateDocumentNote = (doc: DocRow, noteId: string) => {
    const body = editDocNoteBody.trim();
    if (!body) {
      toast.error("Note text is required.");
      return;
    }
    const actionKey = `edit:${doc.id}:${noteId}`;
    setDocNoteActionKey(actionKey);
    if (!getApiBaseUrl()) {
      const today = new Date().toISOString().split("T")[0];
      const nextDocuments = (project?.documents ?? []).map((d) =>
        d.id === doc.id
          ? {
              ...d,
              notes: (d.notes ?? []).map((n) =>
                n.id === noteId ? { ...n, text: body, updatedAt: today } : n
              ),
            }
          : d
      );
      if (project) upsertProject({ ...project, documents: nextDocuments });
      cancelEditDocumentNote();
      toast.success("Note updated.");
      setDocNoteActionKey(null);
      return;
    }
    void updateProjectDocumentNoteApi(project!.id, doc.id, noteId, body)
      .then((updated) => {
        upsertProject(updated);
        cancelEditDocumentNote();
        toast.success("Note updated.");
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not update note.");
      })
      .finally(() => setDocNoteActionKey(null));
  };

  const deleteDocumentNote = async (doc: DocRow, noteId: string) => {
    if (
      !(await confirm({
        title: "Delete note",
        description: "Delete this note? This cannot be undone.",
        confirmLabel: "Delete",
      }))
    ) {
      return;
    }
    const actionKey = `delete:${doc.id}:${noteId}`;
    setDocNoteActionKey(actionKey);
    if (!getApiBaseUrl()) {
      const nextDocuments = (project?.documents ?? []).map((d) =>
        d.id === doc.id ? { ...d, notes: (d.notes ?? []).filter((n) => n.id !== noteId) } : d
      );
      if (project) upsertProject({ ...project, documents: nextDocuments });
      if (editingDocNote?.docId === doc.id && editingDocNote.noteId === noteId) {
        cancelEditDocumentNote();
      }
      toast.success("Note deleted.");
      setDocNoteActionKey(null);
      return;
    }
    void deleteProjectDocumentNoteApi(project!.id, doc.id, noteId)
      .then((updated) => {
        upsertProject(updated);
        if (editingDocNote?.docId === doc.id && editingDocNote.noteId === noteId) {
          cancelEditDocumentNote();
        }
        toast.success("Note deleted.");
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not delete note.");
      })
      .finally(() => setDocNoteActionKey(null));
  };

  const toggleSelect = (docId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === docs.length) setSelected(new Set());
    else setSelected(new Set(docs.map((d) => d.id)));
  };

  const applyBulkStatus = () => {
    if (!bulkStatus) return;
    bulkSetDocStatusStore(project.id, Array.from(selected), bulkStatus as DocumentStatus);
    toast.success(`Updated ${selected.size} documents to "${bulkStatus}"`);
    setBulkStatus("");
    setSelected(new Set());
  };

  const removeChecklistDoc = async (doc: DocRow) => {
    if (doc.required) {
      toast.error("Required checklist rows cannot be deleted.");
      return;
    }
    if (
      !(await confirm({
        title: "Delete checklist row",
        description: `Delete checklist row "${doc.name}"?`,
        confirmLabel: "Delete",
      }))
    ) {
      return;
    }
    if (!getApiBaseUrl()) {
      toast.message("Delete is only available with API enabled.");
      return;
    }
    void deleteProjectDocumentApi(project.id, doc.id)
      .then((updated) => {
        upsertProject(updated);
        toast.success("Checklist row deleted");
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not delete checklist row.");
      });
  };

  const cancelNewFolder = () => {
    setNewFolderName("");
    setFolderCreateMode(null);
  };

  const handleDeleteFolder = async (folder: { id: string; name: string }) => {
    if (!canDeleteFolders) {
      toast.error("You do not have permission to delete folders.");
      return;
    }
    if (
      !(await confirm({
        title: "Delete folder",
        description: `Delete folder “${folder.name}”? It must be empty (no files, no subfolders).`,
        confirmLabel: "Delete",
      }))
    ) {
      return;
    }
    if (!getApiBaseUrl()) {
      removeProjectFileFolderStore(project.id, folder.id);
      if (storageScope === folder.id) setStorageScope("all");
      toast.success(`Removed folder “${folder.name}” (local)`);
      return;
    }
    try {
      await deleteProjectFileFolder(project.id, folder.id);
      const { attachments, fileFolders } = await listProjectStoredFiles(project.id);
      hydrateProjectFilePoolStore(project.id, { attachments, fileFolders });
      if (storageScope === folder.id) setStorageScope("all");
      toast.success(`Deleted folder “${folder.name}”`);
    } catch (err) {
      toast.error("Could not delete folder", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const addFolder = async () => {
    if (!canCreateFolders) {
      toast.error("You do not have permission to create folders.");
      return;
    }
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    const parentId = folderCreateMode?.kind === "subfolder" ? folderCreateMode.parentId : null;
    setNewFolderName("");
    setFolderCreateMode(null);
    if (getApiBaseUrl()) {
      try {
        await createProjectFileFolder(project.id, name, parentId);
        const { attachments, fileFolders } = await listProjectStoredFiles(project.id);
        hydrateProjectFilePoolStore(project.id, { attachments, fileFolders });
        toast.success("Folder created");
      } catch (err) {
        toast.warning("Server folder create failed; added locally.", {
          description: err instanceof Error ? err.message : undefined,
        });
        addProjectFileFolderStore(project.id, name, parentId);
        toast.success("Folder created (local)");
      }
    } else {
      addProjectFileFolderStore(project.id, name, parentId);
      toast.success("Folder created");
    }
  };

  const triggerPoolUpload = () => {
    if (!canUploadDocs) {
      toast.error("You do not have permission to upload files.");
      return;
    }
    poolFileInputRef.current?.click();
  };

  const runPoolUpload = async (file: File): Promise<FileAttachment | null> => {
    if (!canUploadDocs) {
      toast.error("You do not have permission to upload files.");
      return null;
    }
    const targetFolder =
      storageScope === "all" || storageScope === "inbox" ? null : storageScope;
    if (getApiBaseUrl()) {
      try {
        const uploaded = await uploadProjectStoredFile(project.id, file, targetFolder);
        appendProjectAttachmentsStore(project.id, [uploaded]);
        toast.success(`Uploaded “${uploaded.name}” to the pool`);
        return uploaded;
      } catch (err) {
        toast.warning("Server upload failed; saving locally for this session.", {
          description: err instanceof Error ? err.message : undefined,
        });
        addStoredFileToPoolStore(project.id, file, targetFolder, "Kathryn");
        toast.success(`Uploaded “${file.name}” to the pool (local)`);
        return null;
      }
    } else {
      addStoredFileToPoolStore(project.id, file, targetFolder, "Kathryn");
      toast.success(`Uploaded “${file.name}” to the pool`);
      return null;
    }
  };


  const onPoolFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    void runPoolUpload(file)
      .then((uploaded) => {
        if (uploaded?.id) {
          setEsignPrefill({ fileId: uploaded.id, title: uploaded.name, key: Date.now() });
          setEsignOpen(true);
        } else {
          toast.message("Open eSign Template Builder to prepare this file.");
        }
      })
      .finally(() => {
        input.value = "";
      });
  };

  const onPoolDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    const fl = ev.dataTransfer.files;
    if (!fl.length) return;
    if (fl.length > 1) {
      toast.message("One file at a time", {
        description: "Only the first dropped file was added. Upload others separately for DocuSign naming and tabs.",
      });
    }
    void runPoolUpload(fl[0]).then((uploaded) => {
      if (uploaded?.id) {
        setEsignPrefill({ fileId: uploaded.id, title: uploaded.name, key: Date.now() });
        setEsignOpen(true);
      } else {
        toast.message("Open eSign Template Builder to prepare this file.");
      }
    });
  };

  const movePoolFileToFolder = async (file: FileAttachment, folderId: string | null) => {
    if (!canMoveDocs) {
      toast.error("You do not have permission to move files.");
      return;
    }
    if (file.serverBacked && getApiBaseUrl()) {
      try {
        await patchProjectStoredFileFolder(project.id, file.id, folderId);
      } catch (err) {
        toast.error("Could not move file on server", {
          description: err instanceof Error ? err.message : undefined,
        });
        return;
      }
    }
    moveStoredFileToFolderStore(project.id, file.id, folderId);
  };

  const cancelRenamePoolFile = () => {
    setRenamingFileId(null);
    setRenamingTemplateId(null);
    setRenameDraft("");
  };

  const commitRenameTemplate = async (draft: EsignDocumentDto) => {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      toast.error("Template name is required.");
      return;
    }
    if (!canMoveDocs) {
      toast.error("You do not have permission to rename templates.");
      return;
    }
    if (trimmed === draft.title) {
      cancelRenamePoolFile();
      return;
    }
    if (getApiBaseUrl()) {
      try {
        const updated = await patchEsignDocumentTitleApi(project.id, draft.id, trimmed);
        const linkedFile = attachmentById.get(draft.originalFileId);
        if (linkedFile?.serverBacked) {
          try {
            await patchProjectStoredFile(project.id, linkedFile.id, { name: trimmed });
            renameStoredFileInPoolStore(project.id, linkedFile.id, trimmed);
          } catch {
            /* template title saved; stored file rename is best-effort */
          }
        }
        setEsignDrafts((prev) => prev.map((item) => (item.id === draft.id ? { ...item, ...updated } : item)));
        toast.success("Template renamed.");
      } catch (err) {
        toast.error("Could not rename template on server", {
          description: err instanceof Error ? err.message : undefined,
        });
        return;
      }
    } else {
      setEsignDrafts((prev) => prev.map((item) => (item.id === draft.id ? { ...item, title: trimmed } : item)));
      toast.success("Template renamed.");
    }
    cancelRenamePoolFile();
  };

  const commitRenamePoolFile = async (file: FileAttachment) => {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      toast.error("File name is required.");
      return;
    }
    if (!canMoveDocs) {
      toast.error("You do not have permission to rename files.");
      return;
    }
    if (trimmed === file.name) {
      cancelRenamePoolFile();
      return;
    }
    if (getApiBaseUrl() && file.serverBacked) {
      try {
        await patchProjectStoredFile(project.id, file.id, { name: trimmed });
        renameStoredFileInPoolStore(project.id, file.id, trimmed);
        toast.success("File renamed.");
      } catch (err) {
        toast.error("Could not rename file on server", {
          description: err instanceof Error ? err.message : undefined,
        });
        return;
      }
    } else {
      renameStoredFileInPoolStore(project.id, file.id, trimmed);
      toast.success("File renamed.");
    }
    cancelRenamePoolFile();
  };

  const removePoolFile = async (file: FileAttachment) => {
    if (!canDeleteDocs) {
      toast.error("You do not have permission to delete files.");
      return;
    }
    const linked = project.documents.some((d) => (d.attachedFileIds ?? []).includes(file.id));
    if (linked) {
      toast.error("Unlink this file from the checklist before deleting it from the pool.");
      return;
    }
    if (file.serverBacked && getApiBaseUrl()) {
      try {
        await deleteProjectStoredFile(project.id, file.id);
        try {
          const { attachments, fileFolders } = await listProjectStoredFiles(project.id);
          hydrateProjectFilePoolStore(project.id, { attachments, fileFolders });
        } catch {
          deleteStoredFileStore(project.id, file.id);
        }
        toast.success("Removed from pool");
        return;
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 409) {
          const shouldDeleteDrafts = await confirm({
            title: "Delete linked templates",
            description:
              "This file is linked to an eSign template. Delete linked template(s) and then delete this file?",
            confirmLabel: "Delete templates & file",
          });
          if (shouldDeleteDrafts) {
            try {
              const deletedCount = await deleteEsignDraftsByFileApi(project.id, file.id);
              await deleteProjectStoredFile(project.id, file.id);
              const { attachments, fileFolders } = await listProjectStoredFiles(project.id);
              hydrateProjectFilePoolStore(project.id, { attachments, fileFolders });
              try {
                const refreshedDrafts = await loadMergedEsignDrafts();
                setEsignDrafts(refreshedDrafts);
                if (openDraftId && !refreshedDrafts.some((draft) => draft.id === openDraftId)) {
                  setOpenDraftId(null);
                }
              } catch {
                // Keep file deletion success even if draft refresh fails.
              }
              toast.success(
                deletedCount > 0
                  ? `Deleted ${deletedCount} linked template(s) and removed file.`
                  : "Removed file."
              );
              return;
            } catch (innerErr) {
              toast.error("Could not remove linked template + file", {
                description: innerErr instanceof Error ? innerErr.message : undefined,
              });
              return;
            }
          }
        }
        toast.error("Server delete failed", {
          description: err instanceof Error ? err.message : undefined,
        });
        return;
      }
    }
    const r = deleteStoredFileStore(project.id, file.id);
    if (r === "linked") toast.error("Unlink this file from the checklist before deleting it from the pool.");
    else if (r === "ok") toast.success("Removed from pool");
  };

  const openChecklistFilePicker = (docId: string) => {
    if (!canUploadDocs) {
      toast.error("You do not have permission to upload files.");
      return;
    }
    checklistUploadDocIdRef.current = docId;
    checklistFileInputRef.current?.click();
  };

  const onChecklistFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const docId = checklistUploadDocIdRef.current;
    if (!docId) return;
    uploadFileToDocumentStore(project.id, docId, file, "Kathryn");
    toast.success(`Added and linked “${file.name}”`);
    e.target.value = "";
    checklistUploadDocIdRef.current = null;
  };

  const openAttachSheet = (docId: string) => {
    setAttachDocId(docId);
    setAttachPick(new Set());
  };

  const applyAttachSelection = () => {
    if (!attachDocId || attachPick.size === 0) return;
    attachStoredFilesToDocumentStore(project.id, attachDocId, Array.from(attachPick));
    toast.success(`Linked ${attachPick.size} file(s) from the pool`);
    setAttachDocId(null);
    setAttachPick(new Set());
  };

  const toggleAttachPick = (fileId: string) => {
    setAttachPick((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const downloadDocFirst = (doc: DocRow) => {
    const ids = doc.attachedFileIds ?? [];
    if (ids.length === 0) {
      toast.error("No linked file to download");
      return;
    }
    const firstId = ids[0];
    const file = project.attachments.find((a) => a.id === firstId);
    if (file) {
      void downloadPoolFile(file);
      return;
    }
    const base = getApiBaseUrl();
    if (!base || !canDownloadDocs) {
      toast.error("No linked file to download");
      return;
    }
    void (async () => {
      const url = `${base}/api/projects/${encodeURIComponent(project.id)}/stored-files/${encodeURIComponent(firstId)}/download`;
      try {
        const res = await authFetch(url);
        if (!res.ok) {
          let msg = `Download failed (${res.status}).`;
          try {
            const j = (await res.json()) as { error?: { message?: string } };
            if (j?.error?.message) msg = j.error.message;
          } catch {
            /* ignore */
          }
          toast.error(msg);
          return;
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        let fname = doc.name.replace(/[\\/:*?"<>|]+/g, "_");
        const cd = res.headers.get("Content-Disposition");
        const m = cd?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
        if (m?.[1]) {
          try {
            fname = decodeURIComponent(m[1].trim());
          } catch {
            fname = m[1].trim();
          }
        }
        a.download = fname.includes(".") ? fname : `${fname}.pdf`;
        a.click();
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Download failed.");
      }
    })();
  };

  const openDocuSignSingle = (doc: DocRow) => {
    setDocuSignDocs([doc]);
    setDocuSignRecipient(client?.email || "");
    setDocuSignOpen(true);
  };

  const openDocuSignBulk = () => {
    const chosen = docs.filter((d) => selected.has(d.id));
    setDocuSignDocs(chosen);
    setDocuSignRecipient(client?.email || "");
    setDocuSignOpen(true);
  };

  const pullDocuSignImportForRow = async (doc: DocRow) => {
    if (!getApiBaseUrl()) {
      toast.error("API is not configured.");
      return;
    }
    const esignId = doc.esignDocumentId?.trim();
    if (!esignId) {
      toast.error("This checklist row is not linked to an eSign template. Link a vault layout in Documents first.");
      return;
    }
    const tmpl = esignDrafts.find((e) => e.id === esignId);
    const vaultProjectId = tmpl?.projectId ?? CRM_DOCUMENT_VAULT_PROJECT_ID;
    setPullingEsignForDocId(doc.id);
    try {
      const result = await syncDocusignCompletionApi(vaultProjectId, esignId);
      const merged = await loadMergedEsignDrafts();
      setEsignDrafts(merged);
      const p = await getProjectFromApi(project.id);
      upsertProject(p);
      try {
        const { attachments, fileFolders } = await listProjectStoredFiles(project.id);
        hydrateProjectFilePoolStore(project.id, { attachments, fileFolders });
      } catch {
        /* pool refresh optional */
      }
      if (result.imported) {
        toast.success("Signed PDF imported from DocuSign", { description: "Checklist status and download should update." });
      } else if (result.signedStoredFileId) {
        toast.message("Signed PDF already on file.", { description: `DocuSign status: ${result.docusignStatus}` });
      } else {
        toast.message(`DocuSign status: ${result.docusignStatus}`, {
          description:
            "Envelope not completed yet, or DocuSign could not be reached. After the client signs, try again—or use a public API URL with Connect.",
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not import from DocuSign.");
    } finally {
      setPullingEsignForDocId(null);
    }
  };

  const sendDocuSign = () => {
    if (!getApiBaseUrl()) {
      const ids = docuSignDocs.map((d) => d.id);
      bulkSetDocStatusStore(project.id, ids, "Out for Signature");
      toast.success(`${docuSignDocs.length} document(s) marked (offline demo).`);
      setDocuSignOpen(false);
      setDocuSignDocs([]);
      setSelected(new Set());
      return;
    }
    if (docuSignDocs.length !== 1) {
      toast.error("Send one checklist document at a time with live DocuSign.");
      return;
    }
    const doc = docuSignDocs[0];
    const tmpl =
      doc.esignDocumentId?.trim()
        ? esignDrafts.find((e) => e.id === doc.esignDocumentId.trim())
        : esignDrafts.find((draft) => doc.attachedFileIds.includes(draft.originalFileId));
    if (!tmpl) {
      toast.error("Link a file and create an eSign layout in the library first (Documents → open builder on the file).");
      return;
    }
    if (tmpl.status === "sent") {
      toast.message("Envelope already sent for this template. Status will update when signing completes.");
      setDocuSignOpen(false);
      setDocuSignDocs([]);
      return;
    }
    if (tmpl.status !== "ready_for_send" && tmpl.status !== "completed") {
      toast.error("Open the template in the builder and click Mark Ready before sending.");
      return;
    }
    const parsed = parseSignerEmailsFromInput(docuSignRecipient);
    if (parsed.length === 0) {
      toast.error(
        "Enter at least one valid email. Use comma or newline for extra addresses; only the first signs (others are carbon copies)."
      );
      return;
    }
    const strict = validateSignerEmailListForDocuSign(parsed);
    if (strict.ok === false) {
      toast.error(strict.message);
      return;
    }
    void sendEsignDocusignApi(tmpl.projectId, tmpl.id, {
      clientEmail: docuSignRecipient.trim(),
      clientName: client?.name,
      checklistProjectId: project.id,
      checklistProjectDocumentId: doc.id,
    })
      .then(async (result: SendEsignDocusignResult) => {
        const ccList = result.carbonCopyEmails ?? [];
        const ccPart =
          ccList.length > 0 ? `Carbon copies (notify only): ${ccList.join(", ")}.` : "No carbon copies.";
        const signer = (result.signerEmail ?? parsed[0] ?? "").trim() || "signer";
        const tabCount = result.clientSignatureTabCount ?? 0;
        toast.success("DocuSign envelope sent", {
          description: `Signer: ${signer} • ${ccPart} Signature tabs: ${tabCount}. DocuSign id: ${result.docusignEnvelopeId}.`,
        });
        setDocuSignOpen(false);
        setDocuSignDocs([]);
        setSelected(new Set());
        try {
          const documents = await loadMergedEsignDrafts();
          setEsignDrafts(documents);
          const p = await getProjectFromApi(project.id);
          upsertProject(p);
        } catch {
          /* ignore refresh errors */
        }
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not send DocuSign envelope.");
      });
  };

  const attachEmptyHint =
    view === "full"
      ? "All pool files are already linked, or the pool is empty. Upload files in the File pool section above."
      : "All pool files are already linked, or the pool is empty. Upload on the Stored Documents tab first.";

  const removeEsignTemplate = async (draft: EsignDocumentDto) => {
    if (draft.status === "sent" || draft.status === "completed") {
      toast.error("Sent or completed templates cannot be deleted.");
      return;
    }
    if (!(await confirm(deleteTemplateConfirmOptions(draft.title)))) {
      return;
    }
    try {
      await deleteEsignDocumentApi(draft.projectId, draft.id);
      setEsignDrafts((prev) => prev.filter((x) => x.id !== draft.id));
      if (openDraftId === draft.id) setOpenDraftId(null);
      toast.success("Template deleted.");
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.toLowerCase().includes("not found") || error.message.toLowerCase().includes("404"))
      ) {
        setEsignDrafts((prev) => prev.filter((x) => x.id !== draft.id));
        if (openDraftId === draft.id) setOpenDraftId(null);
        toast.success("Template already removed.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Could not delete template.");
    }
  };

  const downloadEsignTemplate = (draft: EsignDocumentDto) => {
    const fileId = draft.renderFileId ?? draft.originalFileId;
    const file = attachmentById.get(fileId);
    if (!file) {
      toast.error("Preview file is not available yet. Open the template builder to finish conversion.");
      return;
    }
    void downloadPoolFile(file);
  };

  const openEsignTemplate = (draftId: string) => {
    setEsignPrefill(null);
    setOpenDraftId(draftId);
    setEsignOpen(true);
  };

  const openEsignBuilderForCreate = () => {
    setOpenDraftId(null);
    setEsignPrefill(null);
    setEsignOpen(true);
  };

  const draftsSection = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Saved eSign Templates</h3>
        <span className="text-xs text-muted-foreground">{esignDrafts.length} template(s)</span>
      </div>
      {esignDrafts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No saved templates yet.</p>
      ) : (
        <div className="space-y-2">
          {esignDrafts.map((draft) => (
            <div key={draft.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5">
              <div className="min-w-0">
                <p className="text-sm truncate">{draft.title}</p>
                <p className="text-[11px] text-muted-foreground">{esignStatusLabel(draft.status)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openEsignTemplate(draft.id)}>
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void removeEsignTemplate(draft)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  const poolSection = (
    poolAccessDenied || !canViewDocs ? (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-6">
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this file pool.
        </p>
      </motion.div>
    ) : (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        poolLayoutBounded
          ? cn("flex min-h-0 flex-1 flex-col overflow-hidden", embeddedTabShellClass)
          : "bg-card border border-border rounded-lg overflow-hidden",
      )}
    >
      <div
        className={cn(
          poolLayoutBounded
            ? "flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
            : "grid grid-cols-1 lg:grid-cols-[minmax(180px,220px)_1fr] lg:min-h-[360px]",
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-col border-b border-border bg-secondary/20 p-3 lg:border-b-0 lg:border-r",
            poolLayoutBounded
              ? "max-h-[min(40vh,280px)] shrink-0 overflow-hidden lg:max-h-none lg:min-h-0 lg:w-[220px] lg:shrink-0"
              : "max-h-[min(40vh,280px)] lg:max-h-none",
          )}
        >
          <p className="mb-2 shrink-0 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</p>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5">
            <button
              type="button"
              onClick={() => setStorageScope("all")}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                storageScope === "all" ? "bg-accent/15 text-accent-foreground font-medium" : "hover:bg-muted"
              }`}
            >
              {poolListsTemplates ? `All templates (${poolTotalCount})` : `All files (${poolTotalCount})`}
            </button>
            <button
              type="button"
              onClick={() => setStorageScope("inbox")}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                storageScope === "inbox" ? "bg-accent/15 text-accent-foreground font-medium" : "hover:bg-muted"
              }`}
            >
              Inbox (unfiled) ({poolListsTemplates ? templateUnfiledCount : unfiledCount})
            </button>
            {folders
              .filter((f) => f.parentId == null)
              .map((folder) => {
                const folderScopeCount = poolListsTemplates
                  ? countTemplatesInFolderScope(folder.id)
                  : countFilesInFolderScope(folder.id);
                const parentActive =
                  storageScope === folder.id ||
                  folders.some((c) => c.parentId === folder.id && c.id === storageScope);
                return (
                <div key={folder.id}>
                  <div className="flex items-center gap-0.5 pr-0.5">
                    <button
                      type="button"
                      onClick={() => setStorageScope(folder.id)}
                      className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        parentActive ? "bg-accent/15 text-accent-foreground font-medium" : "hover:bg-muted"
                      }`}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {folder.name}
                        {folderScopeCount > 0 ? (
                          <span className="text-[10px] font-normal text-muted-foreground">({folderScopeCount})</span>
                        ) : null}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!canDeleteFolders}
                      className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      title={canDeleteFolders ? "Delete folder" : "No permission to delete folders"}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteFolder(folder);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {folders
                    .filter((c) => c.parentId === folder.id)
                    .map((sub) => (
                      <div key={sub.id} className="flex items-center gap-0.5 pl-3 pr-0.5">
                        <button
                          type="button"
                          onClick={() => setStorageScope(sub.id)}
                          className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded text-xs transition-colors ${
                            storageScope === sub.id ? "bg-accent/15 text-accent-foreground font-medium" : "hover:bg-muted"
                          }`}
                        >
                          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                            <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {sub.name}
                            {countItemsInExactFolder(sub.id) > 0 ? (
                              <span className="text-[10px] font-normal text-muted-foreground">
                                ({countItemsInExactFolder(sub.id)})
                              </span>
                            ) : null}
                          </span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!canDeleteFolders}
                          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                          title={canDeleteFolders ? "Delete folder" : "No permission to delete folders"}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteFolder(sub);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                </div>
                );
              })}
            {folderCreateMode?.kind === "parent" ? (
              <div className="flex flex-col gap-1 mt-2">
                <div className="flex gap-1">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addFolder();
                    }}
                    placeholder="Folder name"
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button size="sm" onClick={addFolder} className="h-7 px-2 text-xs shrink-0" disabled={!canCreateFolders}>
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={cancelNewFolder}
                    className="h-7 px-2 text-xs shrink-0"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!canCreateFolders) return;
                  setFolderCreateMode({ kind: "parent" });
                  setNewFolderName("");
                }}
                disabled={!canCreateFolders}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground mt-2 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> New folder
              </button>
            )}
          </div>
        </div>

        <div
          className={cn(
            "m-2 flex min-h-0 flex-col rounded-lg border-2 border-dashed border-transparent p-4 transition-colors hover:border-border/80",
            poolLayoutBounded && "lg:m-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:p-4",
            poolLayoutBounded && embeddedTabOverflowHiddenClass,
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={allowPoolUpload && canUploadDocs ? onPoolDrop : undefined}
        >
          {allowPoolUpload ? (
            <input
              ref={poolFileInputRef}
              type="file"
              accept={POOL_ACCEPT}
              className="hidden"
              onChange={onPoolFilesPicked}
            />
          ) : null}
          <div className="mb-3 shrink-0 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {storageScope === "all" ? (
                <h3 className="font-display text-sm font-semibold text-foreground">
                  {poolListsTemplates ? "All templates" : "All files"} · {poolScopeCount} shown
                </h3>
              ) : storageScope === "inbox" ? (
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Inbox (unfiled) · {poolScopeCount} shown
                </h3>
              ) : (
                <nav aria-label="Folder path" className="flex min-w-0 flex-wrap items-center gap-1 font-display text-sm">
                  <button
                    type="button"
                    onClick={() => setStorageScope("all")}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {poolListsTemplates ? "All templates" : "All files"}
                  </button>
                  {storageBreadcrumb.map((crumb, index) => {
                    const isLast = index === storageBreadcrumb.length - 1;
                    return (
                      <span key={crumb.id} className="inline-flex min-w-0 items-center gap-1">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        {isLast ? (
                          <span className="truncate font-semibold text-foreground">
                            {crumb.name}
                            <span className="ml-1 font-normal text-muted-foreground">· {poolScopeCount} shown</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStorageScope(crumb.id)}
                            className="truncate text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {crumb.name}
                          </button>
                        )}
                      </span>
                    );
                  })}
                </nav>
              )}
              {canCreateSubfolderHere && folderCreateMode?.kind !== "subfolder" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 gap-1 px-2 text-xs"
                  disabled={!canCreateFolders}
                  onClick={() => {
                    if (!canCreateFolders) return;
                    setFolderCreateMode({ kind: "subfolder", parentId: storageScope });
                    setNewFolderName("");
                  }}
                >
                  <Plus className="w-3 h-3" /> New subfolder
                </Button>
              ) : null}
            </div>
            {allowPoolUpload ? (
              <Button
                size="sm"
                className="w-full shrink-0 gap-1 sm:w-auto"
                type="button"
                onClick={triggerPoolUpload}
                disabled={!canUploadDocs}
              >
                <Upload className="w-3 h-3" /> {poolListsTemplates ? "Upload & create template" : "Upload"}
              </Button>
            ) : null}
          </div>
          {folderCreateMode?.kind === "subfolder" ? (
            <div className="mb-3 shrink-0 flex flex-wrap gap-1">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addFolder();
                }}
                placeholder="Subfolder name"
                className="h-8 max-w-xs flex-1 text-xs"
                autoFocus
              />
              <Button size="sm" onClick={addFolder} className="h-8 px-2 text-xs shrink-0" disabled={!canCreateFolders}>
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={cancelNewFolder}
                className="h-8 px-2 text-xs shrink-0"
              >
                Cancel
              </Button>
            </div>
          ) : null}
          <p className="mb-3 shrink-0 text-[11px] text-muted-foreground">
            {!allowPoolUpload
              ? poolListsTemplates
                ? "Browse eSign templates and organize folders. Upload from the Documents hub."
                : "Browse files and organize folders. Upload from the Documents hub."
              : poolListsTemplates
                ? "PDF and Word · Upload creates a stored file and opens the template builder. Word is converted to PDF on the server."
                : view === "full"
                  ? "PDF and Word · Upload one file at a time (DocuSign naming and tabs). Link each to a checklist row below."
                  : "PDF and Word · Upload one file at a time. Link to checklist rows on the Document Checklist tab."}
          </p>
          {poolListsTemplates ? (
            storageScopeChildFolders.length > 0 || filteredEsignDrafts.length > 0 ? (
              <div
                className={cn(
                  "space-y-2 sm:space-y-1",
                  poolLayoutBounded && cn(embeddedTabScrollClass, "pr-0.5"),
                )}
              >
                {storageScopeChildFolders.length > 0 ? (
                  <div className="space-y-1 pb-1">
                    {storageScopeChildFolders.map((sub) => {
                      const itemCount = countItemsInExactFolder(sub.id);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setStorageScope(sub.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/10 p-3 text-left transition-colors hover:bg-secondary/40",
                            "sm:rounded sm:border-0 sm:bg-transparent sm:p-2 sm:hover:bg-muted/60",
                          )}
                        >
                          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{sub.name}</span>
                          {itemCount > 0 ? (
                            <span className="shrink-0 text-xs text-muted-foreground">{itemCount}</span>
                          ) : null}
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {filteredEsignDrafts.map((draft) => {
                  const linkedFile = attachmentById.get(draft.originalFileId);
                  const folderId = folderIdForDraft(draft);
                  const isRenaming = renamingTemplateId === draft.id;
                  return (
                    <div
                      key={draft.id}
                      className={cn(
                        "space-y-2.5 rounded-lg border border-border/60 bg-muted/10 p-3 transition-colors hover:bg-secondary/40",
                        "sm:space-y-0 sm:rounded sm:border-0 sm:bg-transparent sm:p-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2",
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-2 sm:min-w-[12rem] sm:flex-1">
                        <FileText className="h-4 w-4 shrink-0 text-destructive" />
                        {!isRenaming && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                            disabled={!canMoveDocs}
                            title={canMoveDocs ? "Rename template" : "No permission to rename templates"}
                            onClick={() => {
                              setRenamingTemplateId(draft.id);
                              setRenamingFileId(null);
                              setRenameDraft(draft.title);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <div className="min-w-0 flex-1">
                          {isRenaming ? (
                            <div className="space-y-1.5">
                              <Input
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                className="h-8 text-xs"
                                maxLength={512}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void commitRenameTemplate(draft);
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelRenamePoolFile();
                                  }
                                }}
                              />
                              <div className="flex gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => void commitRenameTemplate(draft)}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  onClick={cancelRenamePoolFile}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="truncate text-sm font-medium text-foreground">{draft.title}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {linkedFile
                                  ? `${linkedFile.size}${linkedFile.uploadedAt ? ` · ${linkedFile.uploadedAt}` : ""}`
                                  : "Source file processing…"}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      {!isRenaming ? (
                        <div className="flex flex-col gap-2 sm:contents">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={draft.status === "ready_for_send" ? "default" : "secondary"}
                              className="shrink-0 text-[10px]"
                            >
                              {esignStatusLabel(draft.status)}
                            </Badge>
                            <Select
                              value={folderId ?? "__inbox__"}
                              onValueChange={(v) => {
                                if (!linkedFile) return;
                                void movePoolFileToFolder(linkedFile, v === "__inbox__" ? null : v);
                              }}
                              disabled={!canMoveDocs || !linkedFile}
                            >
                              <SelectTrigger className="h-7 w-full min-w-0 text-xs sm:w-[140px] sm:shrink-0">
                                <SelectValue placeholder="Folder" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__inbox__" className="text-xs">
                                  Inbox (unfiled)
                                </SelectItem>
                                {folders.map((f) => (
                                  <SelectItem key={f.id} value={f.id} className="text-xs">
                                    {f.parentId ? `↳ ${f.name}` : f.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-end gap-1 sm:shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              type="button"
                              onClick={() => openEsignTemplate(draft.id)}
                            >
                              Open
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canDownloadDocs}
                              className="h-7 w-7 p-0"
                              type="button"
                              onClick={() => downloadEsignTemplate(draft)}
                              title="Download PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canDeleteDocs}
                              className="h-7 w-7 p-0 text-destructive"
                              type="button"
                              onClick={() => void removeEsignTemplate(draft)}
                              title="Delete template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Paperclip className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No eSign templates in this view yet.</p>
                {allowPoolUpload ? (
                  <p className="mt-1 text-xs text-muted-foreground">Upload a PDF or Word file to create one.</p>
                ) : null}
              </div>
            )
          ) : storageScopeChildFolders.length > 0 || filteredPoolFiles.length > 0 ? (
            <div
              className={cn(
                "space-y-2 sm:space-y-1",
                poolLayoutBounded && cn(embeddedTabScrollClass, "pr-0.5"),
              )}
            >
              {storageScopeChildFolders.length > 0 ? (
                <div className="space-y-1 pb-1">
                  {storageScopeChildFolders.map((sub) => {
                    const itemCount = countItemsInExactFolder(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setStorageScope(sub.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/10 p-3 text-left transition-colors hover:bg-secondary/40",
                          "sm:rounded sm:border-0 sm:bg-transparent sm:p-2 sm:hover:bg-muted/60",
                        )}
                      >
                        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{sub.name}</span>
                        {itemCount > 0 ? (
                          <span className="shrink-0 text-xs text-muted-foreground">{itemCount}</span>
                        ) : null}
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {filteredPoolFiles.map((file) => {
                const isRenaming = renamingFileId === file.id;
                return (
                <div
                  key={file.id}
                  className={cn(
                    "space-y-2.5 rounded-lg border border-border/60 bg-muted/10 p-3 transition-colors hover:bg-secondary/40",
                    "sm:space-y-0 sm:rounded sm:border-0 sm:bg-transparent sm:p-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-2 sm:min-w-[12rem] sm:flex-1">
                    <FileText className="h-4 w-4 shrink-0 text-destructive" />
                    {!isRenaming && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                        disabled={!canMoveDocs}
                        title={canMoveDocs ? "Rename file" : "No permission to rename files"}
                        onClick={() => {
                          setRenamingFileId(file.id);
                          setRenamingTemplateId(null);
                          setRenameDraft(file.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div className="space-y-1.5">
                          <Input
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            className="h-8 text-xs"
                            maxLength={512}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void commitRenamePoolFile(file);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelRenamePoolFile();
                              }
                            }}
                          />
                          <div className="flex gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => void commitRenamePoolFile(file)}
                            >
                              Save
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={cancelRenamePoolFile}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {file.size} • {file.uploadedAt} • {file.uploadedBy}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  {!isRenaming ? (
                    <div className="flex flex-col gap-2 sm:contents">
                      <Select
                        value={file.folderId ?? "__inbox__"}
                        onValueChange={(v) => {
                          void movePoolFileToFolder(file, v === "__inbox__" ? null : v);
                        }}
                        disabled={!canMoveDocs}
                      >
                        <SelectTrigger className="h-7 w-full min-w-0 text-xs sm:w-[140px] sm:shrink-0">
                          <SelectValue placeholder="Folder" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__inbox__" className="text-xs">
                            Inbox (unfiled)
                          </SelectItem>
                          {folders.map((f) => (
                            <SelectItem key={f.id} value={f.id} className="text-xs">
                              {f.parentId ? `↳ ${f.name}` : f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap items-center justify-end gap-1 sm:shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          title={
                            view === "full"
                              ? "Link this file to a checklist row, then use DocuSign from that row."
                              : "Send this file with DocuSign — coming soon."
                          }
                          className="h-7 cursor-not-allowed gap-1 px-2 text-xs opacity-50"
                          type="button"
                        >
                          <ExternalLink className="h-3 w-3" /> DocuSign
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canDownloadDocs}
                          className="h-7 w-7 p-0"
                          type="button"
                          onClick={() => void downloadPoolFile(file)}
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canDeleteDocs}
                          className="h-7 w-7 p-0 text-destructive"
                          type="button"
                          onClick={() => removePoolFile(file)}
                          title="Remove from pool"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Paperclip className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No files in this view yet.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
    )
  );

  const checklistSection = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        embeddedInTransactionTab
          ? cn(embeddedTabShellClass, embeddedTabOverflowHiddenClass)
          : view === "full"
            ? "pb-8"
            : "pb-24",
      )}
    >
      <div
        className={cn(
          "bg-card border border-border rounded-lg overflow-x-hidden lg:overflow-hidden",
          embeddedInTransactionTab && embeddedTabShellClass,
        )}
      >
        <div className="shrink-0 space-y-2 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Document checklist · {docs.length} documents
            </h3>
            <p className="text-xs text-muted-foreground">{project.type}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-medium">
              {checklistSummary.complete}/{checklistSummary.total} complete
            </Badge>
            {checklistSummary.outForSignature > 0 ? (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-800 dark:text-amber-200">
                Out for signature · {checklistSummary.outForSignature}
              </Badge>
            ) : null}
            {checklistSummary.needsSignature > 0 ? (
              <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-[10px] text-orange-800 dark:text-orange-200">
                Needs signature · {checklistSummary.needsSignature}
              </Badge>
            ) : null}
            {checklistSummary.pending > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                Pending · {checklistSummary.pending}
              </Badge>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            embeddedInTransactionTab
              ? embeddedTabBodyClass
              : "overflow-x-hidden overflow-y-auto overscroll-contain",
          )}
        >
          <div className="space-y-3 p-3 touch-pan-y xl:hidden">
            <label className="flex items-center gap-2 border-b border-border/60 pb-2 text-xs text-muted-foreground">
              <Checkbox
                checked={selected.size === docs.length && docs.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all documents"
              />
              Select all
            </label>
            {docs.map((doc) => (
              <DocumentChecklistRowCard
                key={doc.id}
                doc={doc}
                attachments={project.attachments ?? []}
                selected={selected.has(doc.id)}
                onToggleSelect={() => toggleSelect(doc.id)}
                onStatusChange={(status, customStatus) => updateDocStatus(doc.id, status, customStatus)}
                onDetachFile={(fid) => detachStoredFileFromDocumentStore(project.id, doc.id, fid)}
                onAttach={() => openAttachSheet(doc.id)}
                onDocuSignSend={() => openDocuSignSingle(doc)}
                onDocuSignPull={
                  getApiBaseUrl() && doc.esignDocumentId?.trim()
                    ? () => void pullDocuSignImportForRow(doc)
                    : undefined
                }
                pullingDocuSign={pullingEsignForDocId === doc.id}
                showDocuSignPull={Boolean(getApiBaseUrl() && doc.esignDocumentId?.trim())}
                onUpload={() => openChecklistFilePicker(doc.id)}
                onDownload={() => downloadDocFirst(doc)}
                onDelete={() => removeChecklistDoc(doc)}
                canUpload={canUploadDocs}
                canDownload={canDownloadDocs}
                docNoteDrafts={docNoteDrafts}
                onDocNoteDraftChange={(docId, value) =>
                  setDocNoteDrafts((prev) => ({ ...prev, [docId]: value }))
                }
                editingDocNote={editingDocNote}
                editDocNoteBody={editDocNoteBody}
                onEditDocNoteBodyChange={setEditDocNoteBody}
                docNoteActionKey={docNoteActionKey}
                savingDocNoteId={savingDocNoteId}
                onStartEditNote={startEditDocumentNote}
                onCancelEditNote={cancelEditDocumentNote}
                onUpdateNote={updateDocumentNote}
                onDeleteNote={deleteDocumentNote}
                onSaveNote={saveDocumentNote}
              />
            ))}
          </div>

          <div className="hidden overflow-x-hidden xl:block">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-[min(28%,16rem)]" />
              <col className="w-[11rem]" />
              <col />
              <col className="w-[min(14rem,22%)]" />
              <col className="w-[8.5rem]" />
              <col className="w-[5.25rem]" />
            </colgroup>
            <thead
              className={cn(
                "bg-secondary/40 text-xs text-muted-foreground uppercase tracking-wider",
                embeddedInTransactionTab && "lg:sticky lg:top-0 lg:z-10 lg:bg-secondary/95 lg:backdrop-blur-sm",
              )}
            >
              <tr>
                <th className="px-3 py-2">
                  <Checkbox
                    checked={selected.size === docs.length && docs.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium">Document</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Pool files</th>
                <th className="px-3 py-2 text-left font-medium">Notes</th>
                <th className="px-3 py-2 text-center font-medium">DocuSign</th>
                <th className="px-2 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {docs.map((doc) => (
                <tr
                  key={doc.id}
                  className={cn(checklistRowClass(doc, { selected: selected.has(doc.id) }))}
                >
                  <td className="px-3 py-1.5">
                    <Checkbox
                      checked={selected.has(doc.id)}
                      onCheckedChange={() => toggleSelect(doc.id)}
                      aria-label={`Select ${doc.name}`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="min-w-0 space-y-1">
                      <p
                        className={cn(
                          "truncate font-medium text-foreground",
                          checklistDocNameClass(doc),
                        )}
                        title={doc.name}
                      >
                        {doc.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        {isChecklistDocNa(doc) ? (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wide bg-neutral-500/30 text-muted-foreground">
                            N/A
                          </Badge>
                        ) : null}
                        {doc.required ? (
                          <Badge variant="destructive" className="h-4 px-1 text-[9px] font-semibold uppercase tracking-wide">
                            Req
                          </Badge>
                        ) : null}
                        {doc.sourceRuleId ? (
                          <Badge variant="secondary" className="h-4 px-1 text-[9px] font-semibold">
                            rule #{doc.sourceRuleId}
                          </Badge>
                        ) : null}
                        {!isChecklistDocNa(doc) ? (
                          <StatusBadge status={doc.status} className="text-[10px] sm:px-1.5 sm:py-0" />
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-col gap-1.5">
                      <Select
                        value={doc.status}
                        onValueChange={(v) => updateDocStatus(doc.id, v as DocumentStatus, doc.customStatus)}
                      >
                        <SelectTrigger className="h-7 w-full max-w-[10rem] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOC_STATUS_PRESETS.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {doc.status === "Other" && (
                        <Input
                          value={doc.customStatus || ""}
                          onChange={(e) => updateDocStatus(doc.id, "Other", e.target.value)}
                          placeholder="Custom"
                          className="h-7 text-xs w-24"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 align-top">
                    <div className="flex flex-wrap items-center gap-1">
                      {doc.attachedFileIds.map((fid) => {
                        const f = project.attachments.find((a) => a.id === fid);
                        return (
                          <span
                            key={fid}
                            className="inline-flex items-center gap-0.5 max-w-full rounded border border-border bg-secondary/40 px-1 py-0.5 text-[10px] text-foreground"
                            title={f?.name}
                          >
                            <span className="truncate max-w-[120px]">{f?.name ?? fid}</span>
                            <button
                              type="button"
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                              aria-label={`Unlink ${f?.name ?? "file"}`}
                              onClick={() => detachStoredFileFromDocumentStore(project.id, doc.id, fid)}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => openAttachSheet(doc.id)}
                      >
                        Attach…
                      </Button>
                    </div>
                  </td>
                  <td className="max-w-0 px-3 py-1.5 align-top overflow-hidden">
                    <DocumentChecklistNotesPreview
                      doc={doc}
                      onOpenAllNotes={() => setOpenNotesDocId(doc.id)}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                        type="button"
                        onClick={() => openDocuSignSingle(doc)}
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" /> Send
                      </Button>
                      {getApiBaseUrl() && doc.esignDocumentId?.trim() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-0.5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          type="button"
                          disabled={pullingEsignForDocId === doc.id}
                          title="Import signed PDF from DocuSign (use when Connect cannot reach your API, e.g. localhost)"
                          onClick={() => void pullDocuSignImportForRow(doc)}
                        >
                          <CloudDownload className="h-3 w-3 shrink-0" />
                          {pullingEsignForDocId === doc.id ? "…" : "Pull"}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <DocumentChecklistNotesPopover
                        doc={doc}
                        docNoteDrafts={docNoteDrafts}
                        onDocNoteDraftChange={(docId, value) =>
                          setDocNoteDrafts((prev) => ({ ...prev, [docId]: value }))
                        }
                        editingDocNote={editingDocNote}
                        editDocNoteBody={editDocNoteBody}
                        onEditDocNoteBodyChange={setEditDocNoteBody}
                        docNoteActionKey={docNoteActionKey}
                        savingDocNoteId={savingDocNoteId}
                        onStartEdit={startEditDocumentNote}
                        onCancelEdit={cancelEditDocumentNote}
                        onUpdateNote={updateDocumentNote}
                        onDeleteNote={deleteDocumentNote}
                        onSaveNote={saveDocumentNote}
                        open={openNotesDocId === doc.id}
                        onOpenChange={(open) => setOpenNotesDocId(open ? doc.id : null)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="More actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            disabled={!canUploadDocs}
                            onClick={() => openChecklistFilePicker(doc.id)}
                          >
                            Upload file
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canDownloadDocs || doc.attachedFileIds.length === 0}
                            onClick={() => downloadDocFirst(doc)}
                          >
                            Download file
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={doc.required}
                            className="text-destructive focus:text-destructive"
                            onClick={() => removeChecklistDoc(doc)}
                          >
                            Delete row
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl border border-border bg-foreground px-4 py-3 text-background shadow-2xl"
        >
          <span className="text-sm font-semibold whitespace-nowrap">
            {selected.size} document{selected.size > 1 ? "s" : ""} selected
          </span>
          <div className="h-6 w-px bg-background/20" />
          <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as DocumentStatus)}>
            <SelectTrigger className="h-8 w-[180px] text-xs bg-background/10 border-background/20 text-background">
              <SelectValue placeholder="Bulk change status..." />
            </SelectTrigger>
            <SelectContent>
              {DOC_STATUS_PRESETS.filter((s) => s !== "Other").map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" disabled={!bulkStatus} onClick={applyBulkStatus} className="h-8 text-xs">
            Apply
          </Button>
          <div className="h-6 w-px bg-background/20" />
          <Button
            size="sm"
            variant="secondary"
            onClick={openEsignBuilderForCreate}
            className="h-8 text-xs gap-1 bg-background/10 border border-background/20"
          >
            <Pencil className="w-3 h-3" /> Prepare eSign Template
          </Button>
          <div className="h-6 w-px bg-background/20" />
          <Button size="sm" onClick={openDocuSignBulk} className="h-8 text-xs gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
            <ExternalLink className="w-3 h-3" /> Send to DocuSign
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-1 text-background/70 hover:text-background"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <>
      {view === "full" && (
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">File pool</h2>
            {poolSection}
            <div className="mt-3">{draftsSection}</div>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">Checklist &amp; DocuSign</h2>
            {checklistSection}
          </section>
        </div>
      )}
      {view === "pool-only" && (
        embeddedInTransactionTab ? (
          <div className={cn(transactionDetailTabShellClass, "gap-3")} aria-label="eSign templates">
            {poolSection}
          </div>
        ) : boundedPoolScroll ? (
          <div className={cn(listPagePanelClass, "min-h-0 flex-1")} aria-label="eSign templates">
            <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
              <h2 className="font-display text-lg font-semibold text-foreground">eSign templates</h2>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{poolSection}</div>
            <div className="shrink-0 border-t border-border px-4 py-3 sm:px-5">
              <Button type="button" variant="outline" size="sm" onClick={openEsignBuilderForCreate} className="gap-1">
                <Pencil className="w-3.5 h-3.5" /> Open eSign Template Builder
              </Button>
            </div>
          </div>
        ) : (
          <section className="space-y-3" aria-label="eSign templates">
            <h2 className="font-display text-lg font-semibold text-foreground">eSign templates</h2>
            {poolSection}
          </section>
        )
      )}
      {view === "checklist-only" && checklistSection}
      {!(view === "pool-only" && boundedPoolScroll) ? (
      <div className="mt-3">
        <Button type="button" variant="outline" size="sm" onClick={openEsignBuilderForCreate} className="gap-1">
          <Pencil className="w-3.5 h-3.5" /> Open eSign Template Builder
        </Button>
      </div>
      ) : null}

      <input
        ref={checklistFileInputRef}
        type="file"
        accept={POOL_ACCEPT}
        className="hidden"
        disabled={!canUploadDocs}
        onChange={onChecklistFilesPicked}
      />

      <Sheet
        open={attachDocId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAttachDocId(null);
            setAttachPick(new Set());
          }
        }}
      >
        <SheetContent className="w-[420px] sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-primary" />
              Attach from pool
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Link stored files to <span className="font-medium text-foreground">{attachTargetDoc?.name}</span>.
            </p>
            <div className="space-y-2">
              {project.attachments
                .filter((f) => !(attachTargetDoc?.attachedFileIds ?? []).includes(f.id))
                .map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm cursor-pointer hover:bg-secondary/50"
                  >
                    <Checkbox
                      checked={attachPick.has(f.id)}
                      onCheckedChange={() => toggleAttachPick(f.id)}
                      aria-label={f.name}
                    />
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-foreground">{f.name}</span>
                  </label>
                ))}
              {project.attachments.filter((f) => !(attachTargetDoc?.attachedFileIds ?? []).includes(f.id)).length ===
                0 && <p className="text-xs text-muted-foreground py-4 text-center">{attachEmptyHint}</p>}
            </div>
          </div>
          <SheetFooter className="border-t border-border pt-4 gap-2">
            <Button variant="outline" className="flex-1" type="button" onClick={() => setAttachDocId(null)}>
              Cancel
            </Button>
            <Button className="flex-1" type="button" disabled={attachPick.size === 0} onClick={applyAttachSelection}>
              Link selected ({attachPick.size})
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={docuSignOpen} onOpenChange={setDocuSignOpen}>
        <SheetContent className="w-[420px] sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-primary" />
              Send to DocuSign
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Documents in envelope ({docuSignDocs.length})
              </p>
              <div className="space-y-1.5 bg-secondary/40 rounded-lg p-3">
                {docuSignDocs.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground truncate">{d.name}</span>
                  </div>
                ))}
              </div>
              {docuSignDocs.length > 1 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  All {docuSignDocs.length} documents will be sent as a single envelope (when DocuSign is connected).
                </p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Property</p>
              <p className="text-sm text-foreground">{project.propertyAddress}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recipient</label>
              {docuSignRecipientSuggestions.length > 0 ? (
                <Select value={docuSignRecipientSelectValue} onValueChange={(v) => setDocuSignRecipient(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose signer from this transaction…" />
                  </SelectTrigger>
                  <SelectContent>
                    {docuSignRecipientSuggestions.map((row) => (
                      <SelectItem key={row.email} value={row.email}>
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground"> · {row.email}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={docuSignRecipient}
                onChange={(e) => setDocuSignRecipient(e.target.value)}
                placeholder="signer@email.com (comma / newline for CC)"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Quick pick: contact, parties on the file (buyers, sellers, agents, escrow, TCs), and assigned team. First address signs; extras are carbon copies only. You can still type or paste any
                addresses.
              </p>
            </div>
            <div className="bg-secondary/40 border border-border rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground">
                Requires an eSign template marked <strong>ready_for_send</strong> for the linked file. The first recipient is the only
                DocuSign signer; vendor signature is merged from SMTP settings into the PDF before send. After signing completes,
                Connect downloads the combined PDF when <code className="text-[10px]">/api/docusign/connect</code> is reachable on
                a public URL.
              </p>
            </div>
          </div>
          <SheetFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setDocuSignOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={sendDocuSign} className="flex-1 gap-2" disabled={!docuSignRecipient}>
              <Send className="w-4 h-4" /> Send envelope
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <EsignDraftSheet
        open={esignOpen}
        onOpenChange={(open) => {
          setEsignOpen(open);
          if (!open) {
            setOpenDraftId(null);
            setEsignPrefill(null);
            void loadMergedEsignDrafts().then((merged) => setEsignDrafts(merged));
          }
        }}
        projectId={project.id}
        docs={project.documents}
        attachments={project.attachments}
        prefillFromUpload={esignPrefill}
        initialDraftId={openDraftId}
        defaultClientEmail={client?.email ?? ""}
        recipientEmailSuggestions={docuSignRecipientSuggestions}
        onEnvelopeSent={() => {
          void getProjectFromApi(project.id)
            .then((p) => upsertProject(p))
            .catch(() => {});
        }}
      />
      <ConfirmDialogHost />
    </>
  );
}
