import type { DocumentStatus } from "@/data/mockData";

export type DocumentChecklistNote = {
  id: string;
  date: string;
  text: string;
  author: string;
  updatedAt?: string;
};

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
