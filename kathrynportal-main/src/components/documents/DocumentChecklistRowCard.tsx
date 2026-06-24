import { useState } from "react";
import {
  CloudDownload,
  Download,
  ExternalLink,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { FileAttachment } from "@/data/mockData";
import { DOC_STATUS_PRESETS, type DocumentStatus } from "@/data/mockData";
import DocumentChecklistNotesPopover from "@/components/documents/DocumentChecklistNotesPopover";
import DocumentChecklistNotesPreview from "@/components/documents/DocumentChecklistNotesPreview";
import type { DocumentChecklistNote, DocumentChecklistRow } from "@/components/documents/documentChecklistTypes";
import StatusBadge from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { documentRowAccentClass } from "@/lib/documentChecklistUtils";
import { cn } from "@/lib/utils";

type Props = {
  doc: DocumentChecklistRow;
  attachments: FileAttachment[];
  selected: boolean;
  onToggleSelect: () => void;
  onStatusChange: (status: DocumentStatus, customStatus?: string) => void;
  onDetachFile: (fileId: string) => void;
  onAttach: () => void;
  onDocuSignSend: () => void;
  onDocuSignPull?: () => void;
  pullingDocuSign?: boolean;
  showDocuSignPull?: boolean;
  onUpload: () => void;
  onDownload: () => void;
  onDelete: () => void;
  canUpload: boolean;
  canDownload: boolean;
  docNoteDrafts: Record<string, string>;
  onDocNoteDraftChange: (docId: string, value: string) => void;
  editingDocNote: { docId: string; noteId: string } | null;
  editDocNoteBody: string;
  onEditDocNoteBodyChange: (value: string) => void;
  docNoteActionKey: string | null;
  savingDocNoteId: string | null;
  onStartEditNote: (docId: string, note: DocumentChecklistNote) => void;
  onCancelEditNote: () => void;
  onUpdateNote: (doc: DocumentChecklistRow, noteId: string) => void;
  onDeleteNote: (doc: DocumentChecklistRow, noteId: string) => void;
  onSaveNote: (doc: DocumentChecklistRow) => void;
};

export default function DocumentChecklistRowCard({
  doc,
  attachments,
  selected,
  onToggleSelect,
  onStatusChange,
  onDetachFile,
  onAttach,
  onDocuSignSend,
  onDocuSignPull,
  pullingDocuSign,
  showDocuSignPull,
  onUpload,
  onDownload,
  onDelete,
  canUpload,
  canDownload,
  docNoteDrafts,
  onDocNoteDraftChange,
  editingDocNote,
  editDocNoteBody,
  onEditDocNoteBodyChange,
  docNoteActionKey,
  savingDocNoteId,
  onStartEditNote,
  onCancelEditNote,
  onUpdateNote,
  onDeleteNote,
  onSaveNote,
}: Props) {
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div
      className={cn(
        "touch-pan-y space-y-3 rounded-lg border border-border/70 p-3",
        documentRowAccentClass(doc.status),
        selected && "border-accent/40 bg-accent/5",
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select ${doc.name}`}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-foreground">{doc.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={doc.status} className="text-[10px]" />
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
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={doc.status} onValueChange={(v) => onStatusChange(v as DocumentStatus, doc.customStatus)}>
            <SelectTrigger className="h-8 w-full text-xs">
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
          {doc.status === "Other" ? (
            <Input
              value={doc.customStatus || ""}
              onChange={(e) => onStatusChange("Other", e.target.value)}
              placeholder="Custom status"
              className="h-8 w-full text-xs sm:max-w-[10rem]"
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Pool files</p>
        <div className="flex flex-wrap gap-1.5">
          {doc.attachedFileIds.map((fid) => {
            const f = attachments.find((a) => a.id === fid);
            return (
              <span
                key={fid}
                className="inline-flex max-w-full items-center gap-0.5 rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] text-foreground"
                title={f?.name}
              >
                <span className="max-w-[10rem] truncate">{f?.name ?? fid}</span>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`Unlink ${f?.name ?? "file"}`}
                  onClick={() => onDetachFile(fid)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={onAttach}>
            Attach…
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
        <DocumentChecklistNotesPreview doc={doc} onOpenAllNotes={() => setNotesOpen(true)} />
      </div>

      <div className="flex flex-wrap items-center gap-1 border-t border-border/60 pt-2">
        <DocumentChecklistNotesPopover
          doc={doc}
          docNoteDrafts={docNoteDrafts}
          onDocNoteDraftChange={onDocNoteDraftChange}
          editingDocNote={editingDocNote}
          editDocNoteBody={editDocNoteBody}
          onEditDocNoteBodyChange={onEditDocNoteBodyChange}
          docNoteActionKey={docNoteActionKey}
          savingDocNoteId={savingDocNoteId}
          onStartEdit={onStartEditNote}
          onCancelEdit={onCancelEditNote}
          onUpdateNote={onUpdateNote}
          onDeleteNote={onDeleteNote}
          onSaveNote={onSaveNote}
          showLabel
          open={notesOpen}
          onOpenChange={setNotesOpen}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          type="button"
          onClick={onDocuSignSend}
        >
          <ExternalLink className="h-3 w-3" /> Send
        </Button>
        {showDocuSignPull && onDocuSignPull ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            type="button"
            disabled={pullingDocuSign}
            onClick={onDocuSignPull}
          >
            <CloudDownload className="h-3 w-3 shrink-0" />
            {pullingDocuSign ? "…" : "Pull"}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          disabled={!canUpload}
          className="h-8 w-8 p-0"
          type="button"
          onClick={onUpload}
          title="Upload PDF or Word and link to this row"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          type="button"
          onClick={onDownload}
          disabled={!canDownload || doc.attachedFileIds.length === 0}
          title="Download first linked file"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive"
          type="button"
          disabled={doc.required}
          onClick={onDelete}
          title={doc.required ? "Required rows cannot be deleted" : "Delete checklist row"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
