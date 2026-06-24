import { useMemo } from "react";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import ThreadNotePopoverBody from "@/components/shared/ThreadNotePopoverBody";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { ThreadNote } from "@/types/threadNote";
import { sortChecklistNotesNewestFirst } from "@/lib/documentChecklistNoteUtils";
import { cn } from "@/lib/utils";

type Props = {
  fieldKey: string;
  title: string;
  notes: ThreadNote[];
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  editingNote: { fieldKey: string; noteId: string } | null;
  editNoteBody: string;
  onEditNoteBodyChange: (value: string) => void;
  noteActionKey: string | null;
  canEdit: boolean;
  onStartEdit: (fieldKey: string, note: ThreadNote) => void;
  onCancelEdit: () => void;
  onUpdateNote: (fieldKey: string, noteId: string) => void;
  onDeleteNote: (fieldKey: string, noteId: string) => void;
  onSaveNote: (fieldKey: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function TimelineNotesPopover({
  fieldKey,
  title,
  notes,
  noteDraft,
  onNoteDraftChange,
  editingNote,
  editNoteBody,
  onEditNoteBodyChange,
  noteActionKey,
  canEdit,
  onStartEdit,
  onCancelEdit,
  onUpdateNote,
  onDeleteNote,
  onSaveNote,
  open,
  onOpenChange,
}: Props) {
  const notesCount = notes.length;
  const sortedNotes = useMemo(() => sortChecklistNotesNewestFirst(notes), [notes]);
  const addLoading = noteActionKey === `add:${fieldKey}`;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="Timeline notes"
        >
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          {notesCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-accent-foreground">
              {notesCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,28rem)] overflow-hidden p-4"
        side="left"
        align="end"
        sideOffset={8}
        collisionPadding={16}
      >
        <p className="mb-3 break-words text-xs font-semibold">Notes — {title}</p>
        <div className="max-h-[min(70vh,24rem)] space-y-2.5 overflow-y-auto overflow-x-hidden pr-1">
          {sortedNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          ) : (
            sortedNotes.map((n) => {
              const isEditing = editingNote?.fieldKey === fieldKey && editingNote.noteId === n.id;
              const editLoading = noteActionKey === `edit:${fieldKey}:${n.id}`;
              const deleteLoading = noteActionKey === `delete:${fieldKey}:${n.id}`;
              return (
                <div key={n.id} className="min-w-0 rounded border border-border bg-secondary/20 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-[10px] text-muted-foreground">
                      {n.date}
                      {n.updatedAt && n.updatedAt !== n.date ? (
                        <span className="italic"> · edited {n.updatedAt}</span>
                      ) : null}
                      <span> · {n.author}</span>
                    </p>
                    {canEdit && !isEditing ? (
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Edit note"
                          disabled={Boolean(noteActionKey)}
                          onClick={() => onStartEdit(fieldKey, n)}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                          aria-label="Delete note"
                          disabled={Boolean(noteActionKey)}
                          onClick={() => onDeleteNote(fieldKey, n.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {isEditing ? (
                    <div className="mt-1.5 space-y-1.5">
                      <Textarea
                        rows={3}
                        className="text-xs"
                        value={editNoteBody}
                        onChange={(e) => onEditNoteBodyChange(e.target.value)}
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
                          className={cn("h-7 px-2 text-xs")}
                          onClick={() => onUpdateNote(fieldKey, n.id)}
                          disabled={editLoading || !editNoteBody.trim()}
                        >
                          {editLoading ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ThreadNotePopoverBody text={n.text} />
                  )}
                  {deleteLoading ? <p className="mt-1 text-[10px] text-muted-foreground">Deleting…</p> : null}
                </div>
              );
            })
          )}
        </div>
        {canEdit ? (
          <>
            <Textarea
              placeholder="Add a note…"
              rows={3}
              className="mt-3 text-xs"
              value={noteDraft}
              onChange={(e) => onNoteDraftChange(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              className="mt-2 w-full"
              disabled={addLoading || !noteDraft.trim()}
              onClick={() => onSaveNote(fieldKey)}
            >
              {addLoading ? "Saving…" : "Save Note"}
            </Button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function timelineFieldNoteKey(fieldId: string): string {
  return fieldId;
}

export function timelineCustomNoteKey(customId: string): string {
  return `custom:${customId}`;
}
