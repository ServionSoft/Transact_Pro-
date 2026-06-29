import { useEffect, useRef } from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  label?: string;
  placeholder?: string;
  className?: string;
};

function exec(cmd: string) {
  document.execCommand(cmd, false);
}

export default function EmailRichTextEditor({
  value,
  onChange,
  id = "compose-body",
  label = "Email",
  placeholder = "Write your email…",
  className,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <TooltipProvider delayDuration={300}>
        <div className="overflow-hidden rounded-md border border-input bg-background">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    exec("bold");
                    onChange(editorRef.current?.innerHTML ?? "");
                  }}
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    exec("italic");
                    onChange(editorRef.current?.innerHTML ?? "");
                  }}
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    exec("underline");
                    onChange(editorRef.current?.innerHTML ?? "");
                  }}
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Underline</TooltipContent>
            </Tooltip>
          </div>
          <div
            ref={editorRef}
            id={id}
            role="textbox"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className="min-h-[120px] max-h-56 overflow-y-auto px-3 py-2 text-sm outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline"
            onInput={() => onChange(editorRef.current?.innerHTML ?? "")}
          />
        </div>
      </TooltipProvider>
    </div>
  );
}
