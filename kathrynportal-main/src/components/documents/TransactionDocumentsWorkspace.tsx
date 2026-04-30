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
  MessageSquare,
  Pencil,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { DOC_STATUS_PRESETS } from "@/data/mockData";
import type { DocumentStatus, FileAttachment } from "@/data/mockData";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/apiConfig";
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
  createProjectDocumentApi,
  deleteProjectDocumentApi,
  patchProjectDocumentStatusApi,
} from "@/api/projects";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { hasPermission } from "@/lib/permissions";

export type TransactionDocumentsView = "checklist-only" | "pool-only" | "full";

const POOL_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface DocRow {
  id: string;
  name: string;
  status: DocumentStatus;
  customStatus?: string;
  required: boolean;
  sourceRuleId?: string;
  sourceRuleActionId?: string;
  notesCount: number;
  notes: { date: string; text: string; author: string }[];
  attachedFileIds: string[];
}

export interface TransactionDocumentsWorkspaceProps {
  projectId: string;
  view: TransactionDocumentsView;
  allowPoolUpload?: boolean;
}

export default function TransactionDocumentsWorkspace({
  projectId,
  view,
  allowPoolUpload = true,
}: TransactionDocumentsWorkspaceProps) {
  const project = useAppStore((s) => s.projects.find((p) => p.id === projectId));
  const client = useAppStore((s) => s.clients.find((c) => c.id === project?.clientId));
  const user = useAuthStore((s) => s.user);

  const setDocStatusStore = useAppStore((s) => s.setDocStatus);
  const bulkSetDocStatusStore = useAppStore((s) => s.bulkSetDocStatus);
  const addProjectDocumentStore = useAppStore((s) => s.addProjectDocument);
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

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newDocName, setNewDocName] = useState("");
  const [bulkStatus, setBulkStatus] = useState<DocumentStatus | "">("");
  const [attachDocId, setAttachDocId] = useState<string | null>(null);
  const [attachPick, setAttachPick] = useState<Set<string>>(new Set());

  const [storageScope, setStorageScope] = useState<"all" | "inbox" | string>("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  const poolFileInputRef = useRef<HTMLInputElement>(null);
  const checklistFileInputRef = useRef<HTMLInputElement>(null);
  const checklistUploadDocIdRef = useRef<string | null>(null);

  const [docuSignOpen, setDocuSignOpen] = useState(false);
  const [docuSignDocs, setDocuSignDocs] = useState<DocRow[]>([]);
  const [docuSignRecipient, setDocuSignRecipient] = useState("");
  const [docNoteDrafts, setDocNoteDrafts] = useState<Record<string, string>>({});
  const [savingDocNoteId, setSavingDocNoteId] = useState<string | null>(null);
  const [poolAccessDenied, setPoolAccessDenied] = useState(false);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
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
        notesCount: (d.notes ?? []).length,
        notes: d.notes ?? [],
        attachedFileIds: d.attachedFileIds ?? [],
      })),
    [project]
  );

  const filteredPoolFiles = useMemo(() => {
    if (!project?.attachments) return [];
    if (storageScope === "all") return project.attachments;
    if (storageScope === "inbox") return project.attachments.filter((a) => a.folderId == null);
    return project.attachments.filter((a) => a.folderId === storageScope);
  }, [project, storageScope]);

  const unfiledCount = useMemo(
    () => project?.attachments.filter((a) => a.folderId == null).length ?? 0,
    [project]
  );

  const attachTargetDoc = useMemo(() => docs.find((d) => d.id === attachDocId), [docs, attachDocId]);

  const downloadPoolFile = useCallback((file: FileAttachment) => {
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
      const a = document.createElement("a");
      a.href = file.downloadUrl;
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

  useEffect(() => {
    if (!showPool) return;
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
  }, [projectId, showPool, hydrateProjectFilePoolStore]);

  if (!project) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Transaction not found.
      </div>
    );
  }

  const folders = project.fileFolders ?? [];

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

  const addCustomDoc = () => {
    if (!newDocName.trim()) return;
    const name = newDocName.trim();
    if (!getApiBaseUrl()) {
      addProjectDocumentStore(project.id, name);
      setNewDocName("");
      toast.success(`Added "${name}" to checklist`);
      return;
    }
    void createProjectDocumentApi(project.id, name)
      .then((updated) => {
        upsertProject(updated);
        setNewDocName("");
        toast.success(`Added "${name}" to checklist`);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not add document.");
      });
  };

  const removeChecklistDoc = (doc: DocRow) => {
    if (doc.required) {
      toast.error("Required checklist rows cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete checklist row "${doc.name}"?`)) return;
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
    setShowNewFolder(false);
    setNewFolderParentId(null);
  };

  const handleDeleteFolder = async (folder: { id: string; name: string }) => {
    if (!canDeleteFolders) {
      toast.error("You do not have permission to delete folders.");
      return;
    }
    if (
      !window.confirm(
        `Delete folder “${folder.name}”? It must be empty (no files, no subfolders).`
      )
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
    const parentId = newFolderParentId;
    setNewFolderName("");
    setShowNewFolder(false);
    setNewFolderParentId(null);
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

  const runPoolUpload = async (file: File) => {
    if (!canUploadDocs) {
      toast.error("You do not have permission to upload files.");
      return;
    }
    const targetFolder =
      storageScope === "all" || storageScope === "inbox" ? null : storageScope;
    if (getApiBaseUrl()) {
      try {
        const uploaded = await uploadProjectStoredFile(project.id, file, targetFolder);
        appendProjectAttachmentsStore(project.id, [uploaded]);
        toast.success(`Uploaded “${uploaded.name}” to the pool`);
      } catch (err) {
        toast.warning("Server upload failed; saving locally for this session.", {
          description: err instanceof Error ? err.message : undefined,
        });
        addStoredFileToPoolStore(project.id, file, targetFolder, "Kathryn");
        toast.success(`Uploaded “${file.name}” to the pool (local)`);
      }
    } else {
      addStoredFileToPoolStore(project.id, file, targetFolder, "Kathryn");
      toast.success(`Uploaded “${file.name}” to the pool`);
    }
  };

  const onPoolFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    void runPoolUpload(file).finally(() => {
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
    void runPoolUpload(fl[0]);
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
    setRenameDraft("");
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
    const firstId = doc.attachedFileIds[0];
    const file = project.attachments.find((a) => a.id === firstId);
    if (!file) {
      toast.error("No linked file to download");
      return;
    }
    downloadPoolFile(file);
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

  const sendDocuSign = () => {
    const ids = docuSignDocs.map((d) => d.id);
    bulkSetDocStatusStore(project.id, ids, "Out for Signature");
    toast.success(
      `${docuSignDocs.length} document${docuSignDocs.length > 1 ? "s" : ""} marked for DocuSign`,
      {
        description: `Recipient ${docuSignRecipient}. Status set to Out for Signature (demo — connect DocuSign API for live envelopes).`,
      }
    );
    setDocuSignOpen(false);
    setDocuSignDocs([]);
    setSelected(new Set());
  };

  const attachEmptyHint =
    view === "full"
      ? "All pool files are already linked, or the pool is empty. Upload files in the File pool section above."
      : "All pool files are already linked, or the pool is empty. Upload on the Stored Documents tab first.";

  const poolSection = (
    poolAccessDenied || !canViewDocs ? (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-6">
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this file pool.
        </p>
      </motion.div>
    ) : (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[360px]">
        <div className="border-r border-border bg-secondary/20 p-3 flex flex-col">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Folders</p>
          <div className="flex-1 space-y-0.5">
            <button
              type="button"
              onClick={() => setStorageScope("all")}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                storageScope === "all" ? "bg-accent/15 text-accent-foreground font-medium" : "hover:bg-muted"
              }`}
            >
              All files ({project.attachments.length})
            </button>
            <button
              type="button"
              onClick={() => setStorageScope("inbox")}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                storageScope === "inbox" ? "bg-accent/15 text-accent-foreground font-medium" : "hover:bg-muted"
              }`}
            >
              Inbox (unfiled) ({unfiledCount})
            </button>
            {folders
              .filter((f) => f.parentId == null)
              .map((folder) => (
                <div key={folder.id}>
                  <div className="flex items-center gap-0.5 pr-0.5">
                    <button
                      type="button"
                      onClick={() => setStorageScope(folder.id)}
                      className={`flex-1 min-w-0 text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        storageScope === folder.id ? "bg-accent/15 text-accent-foreground font-medium" : "hover:bg-muted"
                      }`}
                    >
                      📁 {folder.name}
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
                          📁 {sub.name}
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
              ))}
            {showNewFolder ? (
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
                  setShowNewFolder(true);
                  setNewFolderParentId(
                    storageScope === "all" || storageScope === "inbox" ? null : storageScope
                  );
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
          className="p-4 border-2 border-dashed border-transparent rounded-lg m-2 transition-colors hover:border-border/80"
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
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-display font-semibold text-foreground text-sm">
              {storageScope === "all"
                ? "All files"
                : storageScope === "inbox"
                  ? "Inbox (unfiled)"
                  : folders.find((f) => f.id === storageScope)?.name ?? "Folder"}{" "}
              · {filteredPoolFiles.length} shown
            </h3>
            {allowPoolUpload ? (
              <Button size="sm" className="gap-1" type="button" onClick={triggerPoolUpload} disabled={!canUploadDocs}>
                <Upload className="w-3 h-3" /> Upload
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            {!allowPoolUpload
              ? "Browse files and organize folders. Upload from the Documents hub."
              : view === "full"
              ? "PDF and Word · Upload one file at a time (DocuSign naming and tabs). Link each to a checklist row below."
              : view === "pool-only"
                ? "PDF and Word · Upload one file at a time. DocuSign on each row when connected."
                : "PDF and Word · Upload one file at a time. Link to checklist rows on the Document Checklist tab."}
          </p>
          {filteredPoolFiles.length > 0 ? (
            <div className="space-y-1">
              {filteredPoolFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-2 rounded hover:bg-secondary/40 transition-colors"
                >
                  <FileText className="w-4 h-4 text-destructive shrink-0" />
                  {renamingFileId !== file.id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                      disabled={!canMoveDocs}
                      title={canMoveDocs ? "Rename file" : "No permission to rename files"}
                      onClick={() => {
                        setRenamingFileId(file.id);
                        setRenameDraft(file.name);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <div className="flex-1 min-w-0">
                    {renamingFileId === file.id ? (
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
                            className="h-7 text-xs px-2"
                            onClick={() => void commitRenamePoolFile(file)}
                          >
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" className="h-7 text-xs px-2" onClick={cancelRenamePoolFile}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {file.size} • {file.uploadedAt} • {file.uploadedBy}
                        </p>
                      </>
                    )}
                  </div>
                  <Select
                    value={file.folderId ?? "__inbox__"}
                    onValueChange={(v) => {
                      void movePoolFileToFolder(file, v === "__inbox__" ? null : v);
                    }}
                    disabled={!canMoveDocs || renamingFileId === file.id}
                  >
                    <SelectTrigger className="h-7 w-[140px] text-xs shrink-0">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    title={
                      view === "full"
                        ? "Link this file to a checklist row, then use DocuSign from that row."
                        : "Send this file with DocuSign — coming soon."
                    }
                    className="h-7 px-2 text-xs gap-1 opacity-50 cursor-not-allowed"
                    type="button"
                  >
                    <ExternalLink className="w-3 h-3" /> DocuSign
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canDownloadDocs || renamingFileId === file.id}
                    className="h-7 w-7 p-0"
                    type="button"
                    onClick={() => downloadPoolFile(file)}
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canDeleteDocs || renamingFileId === file.id}
                    className="h-7 w-7 p-0 text-destructive"
                    type="button"
                    onClick={() => removePoolFile(file)}
                    title="Remove from pool"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={view === "full" ? "pb-8" : "pb-24"}>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground text-sm">
            Document checklist · {docs.length} documents
          </h3>
          <p className="text-xs text-muted-foreground">{project.type}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 w-8">
                  <Checkbox
                    checked={selected.size === docs.length && docs.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium">Document</th>
                <th className="px-3 py-2 text-left font-medium w-[200px]">Status</th>
                <th className="px-3 py-2 text-center font-medium w-12">Notes</th>
                <th className="px-3 py-2 text-left font-medium min-w-[180px]">Pool files</th>
                <th className="px-3 py-2 text-center font-medium w-28">DocuSign</th>
                <th className="px-3 py-2 text-center font-medium w-12">Upload</th>
                <th className="px-3 py-2 text-center font-medium w-12">Download</th>
                <th className="px-3 py-2 text-center font-medium w-12">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {docs.map((doc) => (
                <tr
                  key={doc.id}
                  className={`hover:bg-secondary/30 ${selected.has(doc.id) ? "bg-accent/5" : ""}`}
                >
                  <td className="px-3 py-1.5">
                    <Checkbox
                      checked={selected.has(doc.id)}
                      onCheckedChange={() => toggleSelect(doc.id)}
                      aria-label={`Select ${doc.name}`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium truncate">{doc.name}</span>
                      {doc.required && (
                        <span className="text-[9px] bg-destructive/10 text-destructive px-1 py-0.5 rounded font-semibold uppercase">
                          Req
                        </span>
                      )}
                      {doc.sourceRuleId && (
                        <span className="text-[9px] bg-secondary text-muted-foreground px-1 py-0.5 rounded font-semibold">
                          rule #{doc.sourceRuleId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={doc.status}
                        onValueChange={(v) => updateDocStatus(doc.id, v as DocumentStatus, doc.customStatus)}
                      >
                        <SelectTrigger className="h-7 text-xs">
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
                  <td className="px-3 py-1.5 text-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="relative inline-flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                          {doc.notesCount > 0 && (
                            <span className="absolute -top-1 -right-1 text-[9px] bg-accent text-accent-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              {doc.notesCount}
                            </span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <p className="text-xs font-semibold mb-2">Notes — {doc.name}</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {doc.notes.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No notes yet.</p>
                          ) : (
                            doc.notes.map((n, idx) => (
                              <div key={`${doc.id}-note-${idx}`} className="rounded border border-border bg-secondary/20 p-2">
                                <p className="text-[10px] text-muted-foreground">{n.date} · {n.author}</p>
                                <p className="text-xs text-foreground">{n.text}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <Textarea
                          placeholder="Add a note..."
                          rows={3}
                          className="text-xs mt-2"
                          value={docNoteDrafts[doc.id] ?? ""}
                          onChange={(e) => setDocNoteDrafts((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => saveDocumentNote(doc)}
                          disabled={savingDocNoteId === doc.id}
                        >
                          Save Note
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td className="px-3 py-1.5 align-top">
                    <div className="flex flex-wrap gap-1 items-center max-w-[240px]">
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
                  <td className="px-3 py-1.5 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10"
                      type="button"
                      onClick={() => openDocuSignSingle(doc)}
                    >
                      <ExternalLink className="w-3 h-3" /> Send
                    </Button>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canUploadDocs}
                      className="h-7 w-7 p-0"
                      type="button"
                      onClick={() => openChecklistFilePicker(doc.id)}
                      title="Upload PDF or Word and link to this row"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      type="button"
                      onClick={() => downloadDocFirst(doc)}
                      disabled={!canDownloadDocs || doc.attachedFileIds.length === 0}
                      title="Download first linked file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      type="button"
                      disabled={doc.required}
                      onClick={() => removeChecklistDoc(doc)}
                      title={doc.required ? "Required rows cannot be deleted" : "Delete checklist row"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr className="bg-secondary/20">
                <td className="px-3 py-2" />
                <td className="px-3 py-2" colSpan={8}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCustomDoc();
                      }}
                      placeholder="+ Add custom document to this checklist..."
                      className="h-7 text-xs"
                    />
                    <Button size="sm" onClick={addCustomDoc} className="h-7 text-xs gap-1">
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {selected.size > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 z-50 border border-border max-w-[95vw] flex-wrap"
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
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">Checklist &amp; DocuSign</h2>
            {checklistSection}
          </section>
        </div>
      )}
      {view === "pool-only" && (
        <section className="space-y-3" aria-label="Upload and stored files">
          <h2 className="font-display text-lg font-semibold text-foreground">Your files</h2>
          {poolSection}
        </section>
      )}
      {view === "checklist-only" && checklistSection}

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
              <Input
                value={docuSignRecipient}
                onChange={(e) => setDocuSignRecipient(e.target.value)}
                placeholder="recipient@email.com"
              />
              <p className="text-[11px] text-muted-foreground">Pre-filled from contact: {client?.name ?? "—"}</p>
            </div>
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground">
                Demo: statuses update to <strong>Out for Signature</strong>. Connect the DocuSign API to create real
                envelopes.
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
    </>
  );
}
