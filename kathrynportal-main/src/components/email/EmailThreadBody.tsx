import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { EmailThread } from "@/types/domain";
import { downloadProjectStoredFile } from "@/api/storedFiles";
import {
  emailBodyLooksLikeHtml,
  emailBodyLooksLong,
  sanitizeEmailHtmlForDisplay,
} from "@/lib/emailHtmlUtils";
import { cn } from "@/lib/utils";

type Props = {
  email: EmailThread;
  projectId: string;
  className?: string;
};

const COLLAPSED_ATTACHMENT_LIMIT = 3;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmailThreadBody({ email, projectId, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const html = emailBodyLooksLikeHtml(email.body);
  const bodyIsLong = emailBodyLooksLong(email.body);
  const attachments = email.attachments ?? [];
  const hiddenAttachmentCount = expanded ? 0 : Math.max(0, attachments.length - COLLAPSED_ATTACHMENT_LIMIT);
  const visibleAttachments = expanded ? attachments : attachments.slice(0, COLLAPSED_ATTACHMENT_LIMIT);
  const hasExtraMeta = Boolean(email.cc || (email.bcc && email.direction === "outbound"));
  const canExpand = bodyIsLong || hasExtraMeta || hiddenAttachmentCount > 0;
  const isCollapsed = canExpand && !expanded;

  const handleDownload = async (storedFileId: string, name: string) => {
    setDownloadingId(storedFileId);
    try {
      await downloadProjectStoredFile(projectId, storedFileId, name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download file.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {email.cc && !isCollapsed ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Cc:</span> {email.cc}
        </p>
      ) : null}
      {email.bcc && email.direction === "outbound" && !isCollapsed ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Bcc:</span> {email.bcc}
        </p>
      ) : null}
      {html ? (
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground",
            isCollapsed && "line-clamp-4",
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeEmailHtmlForDisplay(email.body) }}
        />
      ) : (
        <p
          className={cn(
            "whitespace-pre-wrap text-sm text-muted-foreground",
            isCollapsed && "line-clamp-4",
          )}
        >
          {email.body}
        </p>
      )}
      {visibleAttachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2 pt-1">
          {visibleAttachments.map((att) => (
            <li key={att.id}>
              <button
                type="button"
                disabled={downloadingId === att.storedFileId}
                onClick={() => void handleDownload(att.storedFileId, att.name)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-primary hover:bg-muted/60 disabled:opacity-60"
              >
                <Download className="h-3 w-3 shrink-0" />
                <span className="max-w-[200px] truncate">{att.name}</span>
                <span className="text-muted-foreground">({formatBytes(att.sizeBytes)})</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {canExpand ? (
        <button
          type="button"
          className="text-xs font-medium text-accent hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Show less"
            : hiddenAttachmentCount > 0
              ? `Show more (${hiddenAttachmentCount} more attachment${hiddenAttachmentCount === 1 ? "" : "s"})`
              : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
