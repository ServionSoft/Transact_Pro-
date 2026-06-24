import type { DocumentStatus } from "@/data/mockData";
import type { ThreadNote } from "@/types/threadNote";

export type DocumentChecklistNote = ThreadNote;

export type DocumentChecklistRow = {
  id: string;
  name: string;
  status: DocumentStatus;
  customStatus?: string;
  required: boolean;
  sourceRuleId?: string;
  sourceRuleActionId?: string;
  esignDocumentId?: string;
  notesCount: number;
  notes: DocumentChecklistNote[];
  attachedFileIds: string[];
};
