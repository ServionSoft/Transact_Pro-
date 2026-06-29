export type EmailComposeAttachment = {
  storedFileId: string;
  name: string;
  sizeBytes: number;
};

export type EmailComposeDraft = {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  templateId: string;
  attachments: EmailComposeAttachment[];
};

export function emptyEmailComposeDraft(partial?: Partial<EmailComposeDraft>): EmailComposeDraft {
  return {
    to: [],
    cc: [],
    bcc: [],
    subject: "",
    body: "",
    templateId: "",
    attachments: [],
    ...partial,
  };
}
