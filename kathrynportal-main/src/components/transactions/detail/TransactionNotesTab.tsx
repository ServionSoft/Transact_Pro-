import { useEffect, useState } from "react";
import { ChevronDown, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import type { Project } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listPageBodyClass, transactionTabCardClass } from "@/lib/listPageLayout";
import { cn } from "@/lib/utils";

type ProjectNote = NonNullable<Project["notes"]>[number];

type Props = {
  project: Project;
  notes: ProjectNote[];
  newNoteBody: string;
  onNewNoteBodyChange: (value: string) => void;
  onAddNote: () => void;
  canEdit?: boolean;
  onUpdateNote?: (noteId: string, body: string) => void;
  onDeleteNote?: (noteId: string) => void;
  saving?: boolean;
};

export default function TransactionNotesTab({
  project,
  notes,
  newNoteBody,
  onNewNoteBodyChange,
  onAddNote,
  canEdit = true,
  onUpdateNote,
  onDeleteNote,
  saving = false,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [composeOpen, setComposeOpen] = useState(notes.length === 0);

  useEffect(() => {
    if (notes.length === 0) setComposeOpen(true);
  }, [notes.length]);

  const startEdit = (note: ProjectNote) => {
    setEditingId(note.id);
    setEditBody(note.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBody("");
  };

  const saveEdit = (noteId: string) => {
    const trimmed = editBody.trim();
    if (!trimmed) return;
    onUpdateNote?.(noteId, trimmed);
    cancelEdit();
  };

  const handleAddNote = () => {
    if (!newNoteBody.trim()) return;
    onAddNote();
    setComposeOpen(false);
  };

  return (
    <div className={transactionTabCardClass}>
      <div className="shrink-0 space-y-2 border-b border-border bg-muted/10 p-3 sm:space-y-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Transaction notes</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {project.stage} · {notes.length} note{notes.length === 1 ? "" : "s"}
            </p>
          </div>
          {canEdit && notes.length > 0 && !composeOpen ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 gap-1.5"
              onClick={() => setComposeOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add note
            </Button>
          ) : null}
        </div>
        {canEdit && composeOpen ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="new-note-body" className="text-sm font-medium text-foreground">
                Add note
              </Label>
              {notes.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    setComposeOpen(false);
                    onNewNoteBodyChange("");
                  }}
                >
                  <ChevronDown className="h-3.5 w-3.5" /> Collapse
                </Button>
              ) : null}
            </div>
            <Textarea
              id="new-note-body"
              placeholder="Add a timestamped note…"
              rows={2}
              value={newNoteBody}
              onChange={(e) => onNewNoteBodyChange(e.target.value)}
              className="max-h-24 resize-none bg-background sm:max-h-28 lg:max-h-32"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={handleAddNote}
                disabled={saving || !newNoteBody.trim()}
              >
                <Plus className="h-3.5 w-3.5" /> Add note
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className={cn(listPageBodyClass, "min-h-[12rem] p-3 sm:min-h-[14rem] sm:p-4 lg:min-h-[min(50vh,320px)] lg:p-5")}>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center sm:py-12">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No notes yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Notes are stamped with today&apos;s date and your name when saved.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map((note, index) => (
              <li
                key={note.id}
                className={cn(
                  "rounded-lg border border-border/80 bg-muted/15 px-4 py-3",
                  index === 0 && "border-accent/40 bg-accent/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="tabular-nums">{note.createdAt}</span>
                    {note.updatedAt && note.updatedAt !== note.createdAt ? (
                      <>
                        <span className="mx-1.5">·</span>
                        <span className="italic">edited {note.updatedAt}</span>
                      </>
                    ) : null}
                    <span className="mx-1.5">·</span>
                    <span className="font-medium text-foreground/80">{note.author}</span>
                  </p>
                  {canEdit && onUpdateNote && onDeleteNote && editingId !== note.id && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Edit note"
                        onClick={() => startEdit(note)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label="Delete note"
                        onClick={() => onDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {editingId === note.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      rows={2}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="max-h-28 resize-none bg-background text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving || !editBody.trim()}
                        onClick={() => saveEdit(note.id)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
