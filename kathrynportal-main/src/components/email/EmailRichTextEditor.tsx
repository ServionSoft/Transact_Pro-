import { useEffect, useRef, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Minus,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
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

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function ToolbarSeparator() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

type ToolbarButtonProps = {
  label: string;
  icon: LucideIcon;
  onAction: () => void;
};

function ToolbarButton({ label, icon: Icon, onAction }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => {
            e.preventDefault();
            onAction();
          }}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
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

  const runCommand = (cmd: string, cmdValue?: string) => {
    editorRef.current?.focus();
    exec(cmd, cmdValue);
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const toolbarGroups: ReactNode[] = [
    <>
      <ToolbarButton label="Undo (Ctrl+Z)" icon={Undo2} onAction={() => runCommand("undo")} />
      <ToolbarButton label="Redo (Ctrl+Y)" icon={Redo2} onAction={() => runCommand("redo")} />
    </>,
    <>
      <ToolbarButton label="Bold (Ctrl+B)" icon={Bold} onAction={() => runCommand("bold")} />
      <ToolbarButton label="Italic (Ctrl+I)" icon={Italic} onAction={() => runCommand("italic")} />
      <ToolbarButton label="Underline (Ctrl+U)" icon={Underline} onAction={() => runCommand("underline")} />
      <ToolbarButton label="Strikethrough" icon={Strikethrough} onAction={() => runCommand("strikeThrough")} />
    </>,
    <>
      <ToolbarButton label="Bulleted list" icon={List} onAction={() => runCommand("insertUnorderedList")} />
      <ToolbarButton label="Numbered list" icon={ListOrdered} onAction={() => runCommand("insertOrderedList")} />
    </>,
    <>
      <ToolbarButton label="Align left" icon={AlignLeft} onAction={() => runCommand("justifyLeft")} />
      <ToolbarButton label="Align center" icon={AlignCenter} onAction={() => runCommand("justifyCenter")} />
      <ToolbarButton label="Align right" icon={AlignRight} onAction={() => runCommand("justifyRight")} />
    </>,
    <>
      <ToolbarButton label="Increase indent" icon={IndentIncrease} onAction={() => runCommand("indent")} />
      <ToolbarButton label="Decrease indent" icon={IndentDecrease} onAction={() => runCommand("outdent")} />
    </>,
    <>
      <ToolbarButton label="Clear formatting" icon={RemoveFormatting} onAction={() => runCommand("removeFormat")} />
      <ToolbarButton label="Insert divider" icon={Minus} onAction={() => runCommand("insertHorizontalRule")} />
    </>,
  ];

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <TooltipProvider delayDuration={300}>
        <div className="overflow-hidden rounded-md border border-input bg-background">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
            {toolbarGroups.map((group, index) => (
              <div key={index} className="flex items-center gap-0.5">
                {index > 0 ? <ToolbarSeparator /> : null}
                {group}
              </div>
            ))}
          </div>
          <div
            ref={editorRef}
            id={id}
            role="textbox"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className="min-h-[120px] max-h-56 overflow-y-auto px-3 py-2 text-sm outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_hr]:my-2 [&_hr]:border-border [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            onInput={() => onChange(editorRef.current?.innerHTML ?? "")}
          />
        </div>
      </TooltipProvider>
    </div>
  );
}
