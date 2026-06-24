import type { ThreadNote } from "@/types/threadNote";

/** Newest first (by updatedAt, then date). */
export function sortChecklistNotesNewestFirst(notes: ThreadNote[]): ThreadNote[] {
  return [...notes].sort((a, b) => {
    const da = (a.updatedAt?.trim() || a.date || "").trim();
    const db = (b.updatedAt?.trim() || b.date || "").trim();
    return db.localeCompare(da);
  });
}

export function latestChecklistNote(notes: ThreadNote[]): ThreadNote | null {
  const sorted = sortChecklistNotesNewestFirst(notes);
  return sorted[0] ?? null;
}

/** Rough threshold for in-cell expand vs clamp-only. */
export function noteTextLooksLong(text: string): boolean {
  const t = text.trim();
  return t.length > 90 || t.split("\n").length > 2;
}

export function noteMetaLine(note: ThreadNote): string {
  const parts = [note.date];
  if (note.updatedAt && note.updatedAt !== note.date) {
    parts.push(`edited ${note.updatedAt}`);
  }
  if (note.author?.trim()) parts.push(note.author.trim());
  return parts.join(" · ");
}
