import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDialogOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/** Promise-based CRM confirm dialog (replaces window.confirm). */
export function useConfirmDialog() {
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({ description: "" });

  const finish = useCallback((result: boolean) => {
    if (!resolveRef.current) return;
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOpen(false);
    resolve(result);
  }, []);

  const confirm = useCallback((input: string | ConfirmDialogOptions): Promise<boolean> => {
    const opts: ConfirmDialogOptions =
      typeof input === "string" ? { description: input } : input;
    setOptions({
      title: opts.title ?? "Confirm",
      description: opts.description,
      confirmLabel: opts.confirmLabel ?? (opts.destructive === false ? "Confirm" : "Continue"),
      cancelLabel: opts.cancelLabel ?? "Cancel",
      destructive: opts.destructive ?? true,
    });
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const ConfirmDialogHost = () => (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) finish(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options.title}</AlertDialogTitle>
          <AlertDialogDescription>{options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>{options.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(options.destructive && buttonVariants({ variant: "destructive" }))}
            onClick={() => finish(true)}
          >
            {options.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialogHost };
}
