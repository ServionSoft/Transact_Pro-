import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import type { DocumentChecklistNote, DocumentChecklistRow } from "@/components/documents/documentChecklistTypes";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  doc: DocumentChecklistRow;
  docNoteDrafts: Record<string, string>;
  onDocNoteDraftChange: (docId: string, value: string) => void;
  editingDocNote: { docId: string; noteId: string } | null;
  editDocNoteBody: string;
  onEditDocNoteBodyChange: (value: string) => void;
  docNoteActionKey: string | null;
  savingDocNoteId: string | null;
  onStartEdit: (docId: string, note: DocumentChecklistNote) => void;
  onCancelEdit: () => void;
  onUpdateNote: (doc: DocumentChecklistRow, noteId: string) => void;
  onDeleteNote: (doc: DocumentChecklistRow, noteId: string) => void;
  onSaveNote: (doc: DocumentChecklistRow) => void;
  triggerClassName?: string;
  showLabel?: boolean;
};

export default function DocumentChecklistNotesPopover({
  doc,
  docNoteDrafts,
  onDocNoteDraftChange,
  editingDocNote,
  editDocNoteBody,
  onEditDocNoteBodyChange,
  docNoteActionKey,
  savingDocNoteId,
  onStartEdit,
  onCancelEdit,
  onUpdateNote,
  onDeleteNote,
  onSaveNote,
  triggerClassName,
  showLabel = false,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center justify-center rounded hover:bg-muted transition-colors",
            showLabel ? "h-8 gap-1.5 px-2.5 text-xs text-muted-foreground" : "h-7 w-7",
            triggerClassName,
          )}
        >
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          {showLabel ? <span>Notes</span> : null}
          {doc.notesCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
              {doc.notesCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)]" align="end">
        <p className="mb-2 text-xs font-semibold">Notes — {doc.name}</p>
        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {doc.notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          ) : (
            doc.notes.map((n) => {
              const isEditing = editingDocNote?.docId === doc.id && editingDocNote.noteId === n.id;
              const editLoading = docNoteActionKey === `edit:${doc.id}:${n.id}`;
              const deleteLoading = docNoteActionKey === `delete:${doc.id}:${n.id}`;
              return (
                <div key={n.id} className="rounded border border-border bg-secondary/20 p-2">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-[10px] text-muted-foreground">
                      {n.date}
                      {n.updatedAt && n.updatedAt !== n.date ? (
                        <span className="italic"> · edited {n.updatedAt}</span>
                      ) : null}
                      <span> · {n.author}</span>
                    </p>
                    {!isEditing ? (
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Edit note"
                          disabled={Boolean(docNoteActionKey)}
                          onClick={() => onStartEdit(doc.id, n)}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                          aria-label="Delete note"
                          disabled={Boolean(docNoteActionKey)}
                          onClick={() => void onDeleteNote(doc, n.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {isEditing ? (
                    <div className="mt-1.5 space-y-1.5">
                      <Textarea
                        rows={2}
                        className="text-xs"
                        value={editDocNoteBody}
                        onChange={(e) => onEditDocNoteBodyChange(e.target.value)}
                      />
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={onCancelEdit}
                          disabled={editLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onUpdateNote(doc, n.id)}
                          disabled={editLoading || !editDocNoteBody.trim()}
                        >
                          {editLoading ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{n.text}</p>
                  )}
                  {deleteLoading ? <p className="mt-1 text-[10px] text-muted-foreground">Deleting...</p> : null}
                </div>
              );
            })
          )}
        </div>
        <Textarea
          placeholder="Add a note..."
          rows={2}
          className="mt-2 text-xs"
          value={docNoteDrafts[doc.id] ?? ""}
          onChange={(e) => onDocNoteDraftChange(doc.id, e.target.value)}
        />
        <Button
          size="sm"
          className="mt-2 w-full"
          onClick={() => onSaveNote(doc)}
          disabled={savingDocNoteId === doc.id}
        >
          Save Note
        </Button>
      </PopoverContent>
    </Popover>
  );
}
