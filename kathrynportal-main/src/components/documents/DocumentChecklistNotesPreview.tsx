import type { DocumentChecklistRow } from "@/components/documents/documentChecklistTypes";
import ThreadNotesPreview from "@/components/shared/ThreadNotesPreview";

type Props = {
  doc: DocumentChecklistRow;
  onOpenAllNotes: () => void;
  className?: string;
};

export default function DocumentChecklistNotesPreview({ doc, onOpenAllNotes, className }: Props) {
  return (
    <ThreadNotesPreview notes={doc.notes} onOpenAllNotes={onOpenAllNotes} className={className} />
  );
}
