import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { EmailThread } from "@/types/domain";
import { downloadProjectStoredFile } from "@/api/storedFiles";
import { emailBodyLooksLikeHtml, sanitizeEmailHtmlForDisplay } from "@/lib/emailHtmlUtils";
import { cn } from "@/lib/utils";

type Props = {
  email: EmailThread;
  projectId: string;
  className?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmailThreadBody({ email, projectId, className }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const html = emailBodyLooksLikeHtml(email.body);

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
      {email.cc ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Cc:</span> {email.cc}
        </p>
      ) : null}
      {email.bcc && email.direction === "outbound" ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Bcc:</span> {email.bcc}
        </p>
      ) : null}
      {html ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeEmailHtmlForDisplay(email.body) }}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{email.body}</p>
      )}
      {email.attachments && email.attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2 pt-1">
          {email.attachments.map((att) => (
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
    </div>
  );
}
