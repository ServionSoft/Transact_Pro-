import { MessageSquare, Plus } from "lucide-react";
import type { Project } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ProjectNote = NonNullable<Project["notes"]>[number];

type Props = {
  project: Project;
  notes: ProjectNote[];
  newNoteBody: string;
  onNewNoteBodyChange: (value: string) => void;
  onAddNote: () => void;
  saving?: boolean;
};

export default function TransactionNotesTab({
  project,
  notes,
  newNoteBody,
  onNewNoteBodyChange,
  onAddNote,
  saving = false,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="shrink-0 space-y-3 border-b border-border bg-muted/10 p-4 sm:p-5">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Transaction notes</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {project.stage} · {notes.length} note{notes.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-note-body" className="text-sm font-medium text-foreground">
            Add note
          </Label>
          <Textarea
            id="new-note-body"
            placeholder="Add a timestamped note…"
            rows={3}
            value={newNoteBody}
            onChange={(e) => onNewNoteBodyChange(e.target.value)}
            className="resize-none bg-background"
          />
          <div className="flex justify-end">
            <Button type="button" size="sm" className="gap-1.5" onClick={onAddNote} disabled={saving || !newNoteBody.trim()}>
              <Plus className="h-3.5 w-3.5" /> Add note
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
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
                <p className="text-xs text-muted-foreground">
                  <span className="tabular-nums">{note.createdAt}</span>
                  <span className="mx-1.5">·</span>
                  <span className="font-medium text-foreground/80">{note.author}</span>
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
