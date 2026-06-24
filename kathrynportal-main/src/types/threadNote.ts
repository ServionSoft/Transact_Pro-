/** Shared shape for document-checklist and task note threads. */
export type ThreadNote = {
  id: string;
  date: string;
  text: string;
  author: string;
  updatedAt?: string;
};
