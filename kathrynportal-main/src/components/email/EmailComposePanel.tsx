import { useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { EmailTemplate } from "@/types/domain";
import type { EmailComposeDraft } from "@/types/emailCompose";
import EmailRecipientChipsField from "@/components/email/EmailRecipientChipsField";
import EmailRichTextEditor from "@/components/email/EmailRichTextEditor";
import { uploadProjectStoredFileForEmail } from "@/api/storedFiles";
import EmailTemplateCombobox from "@/components/email/EmailTemplateCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TransactionRecipientSuggestion } from "@/lib/transactionRecipientSuggestions";
import { plainTextFromEmailHtml } from "@/lib/emailHtmlUtils";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENTS = 10;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  draft: EmailComposeDraft;
  onDraftChange: (draft: EmailComposeDraft) => void;
  suggestions: TransactionRecipientSuggestion[];
  projectId?: string;
  emailTemplates?: EmailTemplate[];
  loadingTemplates?: boolean;
  showTemplatePicker?: boolean;
  onApplyTemplate?: (templateId: string) => void | Promise<void>;
  sending?: boolean;
  onSend: () => void;
  onCancel: () => void;
  className?: string;
};

export default function EmailComposePanel({
  draft,
  onDraftChange,
  suggestions,
  projectId,
  emailTemplates = [],
  loadingTemplates = false,
  showTemplatePicker = true,
  onApplyTemplate,
  sending = false,
  onSend,
  onCancel,
  className,
}: Props) {
  const [showCc, setShowCc] = useState(draft.cc.length > 0);
  const [showBcc, setShowBcc] = useState(draft.bcc.length > 0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<EmailComposeDraft>) => onDraftChange({ ...draft, ...patch });

  const totalAttachmentBytes = draft.attachments.reduce((sum, a) => sum + a.sizeBytes, 0);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!projectId) {
      toast.error("Link a transaction before attaching files.");
      return;
    }
    const remaining = MAX_ATTACHMENTS - draft.attachments.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments per email.`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const next = [...draft.attachments];
      let total = totalAttachmentBytes;
      for (const file of picked) {
        if (total + file.size > MAX_TOTAL_BYTES) {
          toast.error("Total attachment size cannot exceed 25 MB.");
          break;
        }
        const uploaded = await uploadProjectStoredFileForEmail(projectId, file);
        next.push({
          storedFileId: uploaded.id,
          name: uploaded.name,
          sizeBytes: file.size,
        });
        total += file.size;
      }
      set({ attachments: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload attachment.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const canSend =
    draft.to.length > 0 &&
    draft.subject.trim().length > 0 &&
    plainTextFromEmailHtml(draft.body).trim().length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <EmailRecipientChipsField
              id="compose-to"
              label="To"
              emails={draft.to}
              onChange={(to) => set({ to })}
              suggestions={suggestions}
              placeholder="Add recipient…"
              showHint
            />
          </div>
          <div className="flex shrink-0 gap-2 pt-7 text-xs">
            {!showCc ? (
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setShowCc(true)}>
                Cc
              </button>
            ) : null}
            {!showBcc ? (
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setShowBcc(true)}>
                Bcc
              </button>
            ) : null}
          </div>
        </div>
        {showCc ? (
          <EmailRecipientChipsField
            id="compose-cc"
            label="Cc"
            emails={draft.cc}
            onChange={(cc) => set({ cc })}
            suggestions={suggestions}
            placeholder="Add Cc…"
          />
        ) : null}
        {showBcc ? (
          <EmailRecipientChipsField
            id="compose-bcc"
            label="Bcc"
            emails={draft.bcc}
            onChange={(bcc) => set({ bcc })}
            suggestions={suggestions}
            placeholder="Add Bcc…"
          />
        ) : null}
      </div>

      {showTemplatePicker ? (
        <div className="space-y-2">
          <Label htmlFor="compose-template" className="text-sm font-medium text-foreground">
            Use template
          </Label>
          <EmailTemplateCombobox
            id="compose-template"
            value={draft.templateId}
            templates={emailTemplates}
            loading={loadingTemplates}
            disabled={emailTemplates.length === 0 && !loadingTemplates}
            placeholder={
              emailTemplates.length === 0 ? "No templates — add in Settings" : "Choose a template…"
            }
            onValueChange={(templateId) => {
              void Promise.resolve(onApplyTemplate?.(templateId)).catch((e) => {
                toast.error("Could not apply template.", {
                  description: e instanceof Error ? e.message : "Unknown error",
                });
              });
            }}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="compose-subject" className="text-sm font-medium text-foreground">
          Subject
        </Label>
        <Input
          id="compose-subject"
          value={draft.subject}
          onChange={(e) => set({ subject: e.target.value })}
          placeholder="Subject"
        />
      </div>

      <EmailRichTextEditor value={draft.body} onChange={(body) => set({ body })} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFilesSelected(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={uploading || !projectId || draft.attachments.length >= MAX_ATTACHMENTS}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Attach files"}
        </Button>
        {draft.attachments.length > 0 ? (
          <span className="text-[11px] text-muted-foreground">
            {formatBytes(totalAttachmentBytes)} / 25 MB
          </span>
        ) : null}
      </div>
      {draft.attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {draft.attachments.map((att) => (
            <li
              key={att.storedFileId}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
            >
              <span className="truncate" title={att.name}>
                {att.name}
              </span>
              <span className="text-muted-foreground">({formatBytes(att.sizeBytes)})</span>
              <button
                type="button"
                className="rounded hover:bg-muted"
                aria-label={`Remove ${att.name}`}
                onClick={() =>
                  set({ attachments: draft.attachments.filter((a) => a.storedFileId !== att.storedFileId) })
                }
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
        <Button type="button" size="sm" className="gap-1.5" disabled={!canSend || sending} onClick={onSend}>
          <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
