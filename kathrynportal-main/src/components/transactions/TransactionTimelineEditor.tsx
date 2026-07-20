import { Info, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FieldLabelHelp from "@/components/shared/FieldLabelHelp";
import type { TransactionFieldHelp } from "@/lib/transactionFieldHelp";
import { normalizeTimelineDate } from "@/lib/businessDays";
import {
  applyTimelineDateInput,
  applyTimelineFieldChange,
  applyTimelineOffsetInput,
  applyCustomTimelineDateInput,
  applyCustomTimelineItemChange,
  buildTimelineEditorRows,
  createCustomTimelineItem,
  formatTimelineDisplayDate,
  removeCustomTimelineItem,
  timelineStatusOf,
  TIMELINE_STATUS_COMPLETED,
  TIMELINE_STATUS_NA,
  type CopSprpState,
  type CustomTimelineItem,
  type CustomTimelineState,
  type TimelineEditorContext,
  type TimelineFieldDef,
  type TimelineFieldId,
  type TimelineFormState,
  type TimelineOffsetsState,
  type TimelineRequiredContext,
} from "@/lib/transactionTimelineFields";
import { cn } from "@/lib/utils";
import ThreadNotesPreview from "@/components/shared/ThreadNotesPreview";
import TimelineNotesPopover, {
  timelineCustomNoteKey,
  timelineFieldNoteKey,
} from "@/components/transactions/detail/TimelineNotesPopover";
import type { ThreadNote } from "@/types/threadNote";

type DeadlineRef = {
  id: string;
  title: string;
  date: string;
  formManaged?: boolean;
};

type FormModeProps = {
  mode: "form";
  timeline: TimelineFormState;
  cop: CopSprpState;
  sprp: CopSprpState;
  timelineOffsets: TimelineOffsetsState;
  context: TimelineEditorContext;
  requiredContext?: TimelineRequiredContext;
  invalidFieldIds?: Partial<Record<TimelineFieldId, boolean>>;
  suggestedFieldIds?: Partial<Record<TimelineFieldId, boolean>>;
  onTimelineChange: Dispatch<SetStateAction<TimelineFormState>>;
  onCopChange: Dispatch<SetStateAction<CopSprpState>>;
  onSprpChange: Dispatch<SetStateAction<CopSprpState>>;
  onTimelineOffsetsChange: Dispatch<SetStateAction<TimelineOffsetsState>>;
  customTimeline: CustomTimelineState;
  onCustomTimelineChange: Dispatch<SetStateAction<CustomTimelineState>>;
  showCOP: boolean;
  showSPRP: boolean;
  onShowCOPChange: (next: boolean) => void;
  onShowSPRPChange: (next: boolean) => void;
};

type DetailModeProps = {
  mode: "detail";
  timeline: TimelineFormState;
  cop: CopSprpState;
  sprp: CopSprpState;
  timelineOffsets?: TimelineOffsetsState;
  context: TimelineEditorContext;
  customTimeline: CustomTimelineState;
  deadlines: DeadlineRef[];
  canEdit?: boolean;
  timelineNotesByField?: Record<string, ThreadNote[]>;
  onAddTimelineNote?: (fieldKey: string, body: string) => void;
  onUpdateTimelineNote?: (fieldKey: string, noteId: string, body: string) => void;
  onDeleteTimelineNote?: (fieldKey: string, noteId: string) => void;
  timelineNoteBusy?: string | null;
  onCustomTimelineChange?: (next: CustomTimelineState) => void;
  onDeadlineDateChange?: (deadlineId: string, date: string) => void;
  onTimelineFieldDateChange?: (fieldId: TimelineFieldDef["id"], date: string) => void;
  onDeadlineDelete?: (deadlineId: string, title: string, formManaged?: boolean) => void;
  /** When "external", the trigger button is rendered outside this component (e.g. tab header). */
  addCustomTrigger?: "inline" | "external";
  showAddCustom?: boolean;
  onShowAddCustomChange?: (show: boolean) => void;
};

export type TransactionTimelineEditorProps = FormModeProps | DetailModeProps;

function FieldLabel({
  title,
  labelHelp,
  required,
}: {
  title: string;
  labelHelp?: TransactionFieldHelp;
  required?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="truncate text-xs font-medium text-foreground">
        {title}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {labelHelp ? <FieldLabelHelp help={labelHelp} label={title} /> : null}
    </div>
  );
}

export default function TransactionTimelineEditor(props: TransactionTimelineEditorProps) {
  const { timeline, cop, sprp, context } = props;
  const timelineOffsets = props.mode === "form" ? props.timelineOffsets : (props.timelineOffsets ?? {});
  const invalidFieldIds = props.mode === "form" ? (props.invalidFieldIds ?? {}) : {};
  const suggestedFieldIds = props.mode === "form" ? (props.suggestedFieldIds ?? {}) : {};
  const [weekendNotes, setWeekendNotes] = useState<Partial<Record<TimelineFieldId, string>>>({});

  const rows = buildTimelineEditorRows({
    timeline,
    cop,
    sprp,
    context,
    requiredContext:
      props.mode === "form"
        ? props.requiredContext ?? { ...context, timelineApplies: true, isBuyerFile: true }
        : undefined,
    offsets: timelineOffsets,
    deadlines: props.mode === "detail" ? props.deadlines : undefined,
  });

  const [detailCustomDraft, setDetailCustomDraft] = useState<CustomTimelineState>([]);
  // Detail mode: fields the user switched back to date-entry despite a stored Completed/N/A status.
  const [detailDateEntry, setDetailDateEntry] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (props.mode === "detail") setDetailCustomDraft(props.customTimeline);
  }, [props.mode, props.customTimeline]);

  const customRows = props.mode === "form" ? props.customTimeline : detailCustomDraft;
  const [showAddCustomInternal, setShowAddCustomInternal] = useState(false);
  const addCustomTriggerExternal =
    props.mode === "detail" && props.addCustomTrigger === "external";
  const showAddCustom =
    addCustomTriggerExternal && props.showAddCustom !== undefined
      ? props.showAddCustom
      : showAddCustomInternal;
  const setShowAddCustom = (next: boolean) => {
    if (addCustomTriggerExternal && props.onShowAddCustomChange) {
      props.onShowAddCustomChange(next);
    } else {
      setShowAddCustomInternal(next);
    }
  };
  const [newCustomTitle, setNewCustomTitle] = useState("");
  const [newCustomKind, setNewCustomKind] = useState<"date" | "text">("date");
  const [newCustomValue, setNewCustomValue] = useState("");

  const [timelineNoteDrafts, setTimelineNoteDrafts] = useState<Record<string, string>>({});
  const [editingTimelineNote, setEditingTimelineNote] = useState<{ fieldKey: string; noteId: string } | null>(null);
  const [editTimelineNoteBody, setEditTimelineNoteBody] = useState("");
  const [openTimelineNotesKey, setOpenTimelineNotesKey] = useState<string | null>(null);

  const timelineNotesByField = props.mode === "detail" ? (props.timelineNotesByField ?? {}) : {};
  const timelineNoteBusy = props.mode === "detail" ? (props.timelineNoteBusy ?? null) : null;
  const canEditTimelineNotes = props.mode === "detail" && Boolean(props.canEdit);

  const notesForKey = (fieldKey: string): ThreadNote[] => timelineNotesByField[fieldKey] ?? [];

  const renderDetailNotesCell = (fieldKey: string, title: string) => (
    <td className="min-w-[140px] max-w-[220px] px-3 py-2 align-middle">
      <ThreadNotesPreview
        notes={notesForKey(fieldKey)}
        onOpenAllNotes={() => setOpenTimelineNotesKey(fieldKey)}
      />
    </td>
  );

  const renderDetailNotesAction = (fieldKey: string, title: string) => (
    <TimelineNotesPopover
      fieldKey={fieldKey}
      title={title}
      notes={notesForKey(fieldKey)}
      noteDraft={timelineNoteDrafts[fieldKey] ?? ""}
      onNoteDraftChange={(value) =>
        setTimelineNoteDrafts((prev) => ({ ...prev, [fieldKey]: value }))
      }
      editingNote={editingTimelineNote}
      editNoteBody={editTimelineNoteBody}
      onEditNoteBodyChange={setEditTimelineNoteBody}
      noteActionKey={timelineNoteBusy}
      canEdit={canEditTimelineNotes}
      open={openTimelineNotesKey === fieldKey}
      onOpenChange={(next) => setOpenTimelineNotesKey(next ? fieldKey : null)}
      onStartEdit={(key, note) => {
        setEditingTimelineNote({ fieldKey: key, noteId: note.id });
        setEditTimelineNoteBody(note.text);
      }}
      onCancelEdit={() => {
        setEditingTimelineNote(null);
        setEditTimelineNoteBody("");
      }}
      onUpdateNote={(key, noteId) => props.onUpdateTimelineNote?.(key, noteId, editTimelineNoteBody)}
      onDeleteNote={(key, noteId) => props.onDeleteTimelineNote?.(key, noteId)}
      onSaveNote={(key) => {
        const body = (timelineNoteDrafts[key] ?? "").trim();
        if (!body) return;
        props.onAddTimelineNote?.(key, body);
        setTimelineNoteDrafts((prev) => ({ ...prev, [key]: "" }));
      }}
    />
  );

  const applyCustomTimelineState = (next: CustomTimelineState, persist = false) => {
    if (props.mode === "form") {
      props.onCustomTimelineChange(next);
      return;
    }
    setDetailCustomDraft(next);
    if (persist) props.onCustomTimelineChange?.(next);
  };

  const applyBundle = (bundle: ReturnType<typeof applyTimelineDateInput>) => {
    if (props.mode !== "form") return;
    props.onTimelineChange(bundle.timeline);
    props.onCopChange(bundle.cop);
    props.onSprpChange(bundle.sprp);
    props.onTimelineOffsetsChange(bundle.offsets);
  };

  const flushDetailCustomTimeline = (draft: CustomTimelineState) => {
    if (props.mode !== "detail") return;
    props.onCustomTimelineChange?.(draft);
  };

  const handleAddCustomItem = () => {
    const title = newCustomTitle.trim();
    if (!title) {
      toast.error("Custom item title is required.");
      return;
    }
    if (newCustomKind === "date" && !newCustomValue.trim()) {
      toast.error("Date is required for custom date items.");
      return;
    }
    let value = newCustomValue.trim();
    if (newCustomKind === "date" && value) {
      const normalized = normalizeTimelineDate(value);
      value = normalized.date;
      if (normalized.note) toast.info(normalized.note);
    }
    const item = createCustomTimelineItem(title, newCustomKind, value);
    const next = [...customRows.filter((row) => !row.legacy), item];
    applyCustomTimelineState(next, props.mode === "detail");
    setNewCustomTitle("");
    setNewCustomValue("");
    setShowAddCustom(false);
  };

  const handleCustomItemChange = (
    item: CustomTimelineItem,
    patch: Partial<Pick<CustomTimelineItem, "title" | "kind" | "value">>,
    persist = props.mode === "form",
  ) => {
    if (item.legacy) return;
    const next = applyCustomTimelineItemChange(customRows.filter((row) => !row.legacy), item.id, patch);
    if (persist) applyCustomTimelineState(next, true);
    else if (props.mode === "detail") setDetailCustomDraft(next);
  };

  const flushDetailCustomTimelineOnBlur = () => {
    if (props.mode === "detail") flushDetailCustomTimeline(detailCustomDraft);
  };

  const handleCustomDateChange = (item: CustomTimelineItem, rawDate: string) => {
    if (item.legacy && item.deadlineId && props.mode === "detail") {
      if (!rawDate) return;
      const normalized = normalizeTimelineDate(rawDate);
      if (normalized.date === item.value) return;
      if (normalized.note) toast.info(normalized.note);
      props.onDeadlineDateChange?.(item.deadlineId, normalized.date);
      return;
    }
    if (item.legacy) return;
    const metadataItems = customRows.filter((row) => !row.legacy);
    const bundle = applyCustomTimelineDateInput(metadataItems, item.id, rawDate);
    if (bundle.weekendNote) toast.info(bundle.weekendNote);
    if (props.mode === "form") {
      props.onCustomTimelineChange(bundle);
    } else {
      applyCustomTimelineState(bundle, true);
    }
  };

  const handleCustomDelete = (item: CustomTimelineItem) => {
    if (item.legacy && item.deadlineId && props.mode === "detail") {
      props.onDeadlineDelete?.(item.deadlineId, item.title, false);
      return;
    }
    const next = removeCustomTimelineItem(customRows.filter((row) => !row.legacy), item.id);
    applyCustomTimelineState(next, props.mode === "detail");
  };

  const handleCustomKindChange = (item: CustomTimelineItem, kind: "date" | "text") => {
    handleCustomItemChange(item, { kind, value: "" }, true);
  };

  const handleFormTextChange = (fieldId: TimelineFieldId, value: string) => {
    if (props.mode !== "form") return;
    if (fieldId === "copIntoContract" || fieldId === "copCoe") {
      props.onCopChange((prevCop) =>
        applyTimelineFieldChange(fieldId, value, { timeline, cop: prevCop, sprp }).cop,
      );
      return;
    }
    if (fieldId === "sprpIntoContract" || fieldId === "sprpCoe") {
      props.onSprpChange((prevSprp) =>
        applyTimelineFieldChange(fieldId, value, { timeline, cop, sprp: prevSprp }).sprp,
      );
      return;
    }
    props.onTimelineChange((prevTimeline) =>
      applyTimelineFieldChange(fieldId, value, { timeline: prevTimeline, cop, sprp }).timeline,
    );
  };

  const handleFormDateChange = (fieldId: TimelineFieldId, rawDate: string) => {
    if (props.mode !== "form") return;
    const bundle = applyTimelineDateInput(fieldId, rawDate, {
      timeline,
      cop,
      sprp,
      offsets: timelineOffsets,
    });
    applyBundle(bundle);
    if (bundle.weekendNote) {
      setWeekendNotes((prev) => ({ ...prev, [fieldId]: bundle.weekendNote! }));
      toast.info(bundle.weekendNote);
    } else {
      setWeekendNotes((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  /** Form mode: mark a milestone Completed / N/A (or back to Date) in place of a date. */
  const handleFormStatusChange = (fieldId: TimelineFieldId, statusValue: string) => {
    if (props.mode !== "form") return;
    const changed = applyTimelineFieldChange(fieldId, statusValue, { timeline, cop, sprp });
    const nextOffsets = { ...timelineOffsets };
    delete nextOffsets[fieldId];
    applyBundle({ ...changed, offsets: nextOffsets });
    setWeekendNotes((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleFormOffsetChange = (
    fieldId: TimelineFieldId,
    partial: { days?: string | number; dayType?: "calendar" | "business"; anchorField?: TimelineFieldId },
  ) => {
    if (props.mode !== "form") return;
    const bundle = applyTimelineOffsetInput(fieldId, partial, {
      timeline,
      cop,
      sprp,
      offsets: timelineOffsets,
    });
    applyBundle(bundle);
  };

  const handleDetailDateChange = (row: (typeof rows)[number], rawDate: string) => {
    if (props.mode !== "detail") return;
    if (!rawDate) return;
    const normalized = normalizeTimelineDate(rawDate);
    setDetailDateEntry((prev) => {
      if (!prev[row.fieldId]) return prev;
      const next = { ...prev };
      delete next[row.fieldId];
      return next;
    });
    if (normalized.date === row.storedValue) return;
    if (normalized.note) toast.info(normalized.note);
    if (row.deadlineId) {
      props.onDeadlineDateChange?.(row.deadlineId, normalized.date);
      return;
    }
    props.onTimelineFieldDateChange?.(row.fieldId, normalized.date);
  };

  /**
   * Detail mode: mark a milestone Completed / N/A (persists a sentinel via the timeline-field
   * endpoint, which drops the synced deadline) or reveal the date picker again ("date").
   */
  const handleDetailStatusChange = (row: (typeof rows)[number], choice: "date" | "completed" | "na") => {
    if (props.mode !== "detail") return;
    if (choice === "date") {
      setDetailDateEntry((prev) => ({ ...prev, [row.fieldId]: true }));
      return;
    }
    setDetailDateEntry((prev) => {
      const next = { ...prev };
      delete next[row.fieldId];
      return next;
    });
    const sentinel = choice === "completed" ? TIMELINE_STATUS_COMPLETED : TIMELINE_STATUS_NA;
    if (sentinel === row.storedValue) return;
    props.onTimelineFieldDateChange?.(row.fieldId, sentinel);
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        Deadlines that fall on a weekend or holiday move to the following business day automatically. Use the
        status selector to mark a milestone <span className="font-medium">Completed</span> or{" "}
        <span className="font-medium">N/A</span> instead of a date.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border/80">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Field</th>
              {props.mode === "form" ? <th className="w-52 px-3 py-2">Offset</th> : null}
              <th className="w-28 px-3 py-2">Status</th>
              <th className="w-44 px-3 py-2">Date / Value</th>
              {props.mode === "detail" ? <th className="min-w-[140px] px-3 py-2">Notes</th> : null}
              {props.mode === "detail" ? <th className="w-24 px-3 py-2 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.fieldId}
                className={cn(
                  "border-b border-border/60 last:border-b-0",
                  row.disabled && "bg-muted/20 opacity-80",
                )}
              >
                <td className="px-3 py-2 align-middle">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <FieldLabel title={row.title} labelHelp={row.labelHelp} required={row.required && !row.disabled} />
                    {row.disabled && row.disabledHint ? (
                      <span className="inline-flex w-fit items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Info className="h-2.5 w-2.5" /> N/A
                      </span>
                    ) : null}
                    {row.textHint ? <span className="text-[10px] text-muted-foreground">{row.textHint}</span> : null}
                  </div>
                </td>
                {props.mode === "form" ? (
                <td className="px-3 py-2 align-middle">
                  {row.kind === "date" && !row.disabled && !timelineStatusOf(row.storedValue) ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          placeholder={row.suggestedOffsetDays ? String(row.suggestedOffsetDays) : "Days"}
                          value={row.offset?.days ?? ""}
                          onChange={(e) => handleFormOffsetChange(row.fieldId, { days: e.target.value })}
                          className="h-8 w-16 text-xs"
                          aria-label={`${row.title} offset days`}
                        />
                        <Select
                          value={row.offset?.dayType ?? row.suggestedOffsetType ?? "calendar"}
                          onValueChange={(v) => {
                            const days = row.offset?.days ?? row.suggestedOffsetDays;
                            if (!days) return;
                            handleFormOffsetChange(row.fieldId, { dayType: v as "calendar" | "business" });
                          }}
                        >
                          <SelectTrigger className="h-8 w-[92px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="calendar">Calendar</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
                ) : null}
                <td className="px-3 py-2 align-middle">
                  {row.kind !== "date" ? (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  ) : props.mode === "form" ? (
                    <Select
                      value={timelineStatusOf(row.storedValue) ?? "date"}
                      disabled={row.disabled}
                      onValueChange={(v) => {
                        if (v === "completed") handleFormStatusChange(row.fieldId, TIMELINE_STATUS_COMPLETED);
                        else if (v === "na") handleFormStatusChange(row.fieldId, TIMELINE_STATUS_NA);
                        else handleFormStatusChange(row.fieldId, "");
                      }}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs" aria-label={`${row.title} status`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : props.canEdit && row.formManaged && !row.disabled ? (
                    <Select
                      value={detailDateEntry[row.fieldId] ? "date" : timelineStatusOf(row.storedValue) ?? "date"}
                      onValueChange={(v) => handleDetailStatusChange(row, v as "date" | "completed" | "na")}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs" aria-label={`${row.title} status`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="na">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs font-medium text-foreground">
                      {row.disabled
                        ? "N/A"
                        : timelineStatusOf(row.value)
                          ? formatTimelineDisplayDate(row.value)
                          : "Date"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="space-y-0.5">
                    {props.mode === "form" ? (
                      row.kind === "date" ? (
                        timelineStatusOf(row.storedValue) ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Input
                            id={`timeline-${row.fieldId}`}
                            name={`timeline.${row.fieldId}`}
                            autoComplete="off"
                            type="date"
                            value={row.disabled ? "" : row.storedValue}
                            disabled={row.disabled}
                            required={row.required && !row.disabled}
                            aria-invalid={invalidFieldIds[row.fieldId] || undefined}
                            onChange={(e) => handleFormDateChange(row.fieldId, e.target.value)}
                            className={cn(
                              "h-8 w-[140px] text-xs border-2",
                              invalidFieldIds[row.fieldId] && "border-destructive bg-destructive/10 focus-visible:ring-destructive",
                              !invalidFieldIds[row.fieldId] && suggestedFieldIds[row.fieldId] && "border-amber-500 bg-amber-500/15 focus-visible:ring-amber-500/40",
                              !invalidFieldIds[row.fieldId] &&
                                !suggestedFieldIds[row.fieldId] &&
                                !row.disabled &&
                                !String(row.storedValue ?? "").trim() &&
                                "border-dashed border-orange-500 bg-orange-500/15 dark:border-orange-400",
                              !invalidFieldIds[row.fieldId] &&
                                !suggestedFieldIds[row.fieldId] &&
                                !row.disabled &&
                                !!String(row.storedValue ?? "").trim() &&
                                "border-solid border-emerald-600/50 bg-emerald-500/10 dark:border-emerald-500/45",
                            )}
                          />
                        )
                      ) : (
                        <Input
                          id={`timeline-${row.fieldId}`}
                          name={`timeline.${row.fieldId}`}
                          autoComplete="off"
                          value={row.storedValue}
                          onChange={(e) => handleFormTextChange(row.fieldId, e.target.value)}
                          className={cn(
                            "h-8 text-xs border-2",
                            !String(row.storedValue ?? "").trim()
                              ? "border-dashed border-orange-500 bg-orange-500/15 dark:border-orange-400"
                              : "border-solid border-emerald-600/50 bg-emerald-500/10 dark:border-emerald-500/45",
                          )}
                        />
                      )
                    ) : row.kind === "date" && props.canEdit && row.formManaged && !row.disabled ? (
                      !detailDateEntry[row.fieldId] && timelineStatusOf(row.storedValue) ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Input
                          id={`timeline-${row.fieldId}`}
                          name={`timeline.${row.fieldId}`}
                          autoComplete="off"
                          type="date"
                          value={timelineStatusOf(row.storedValue) ? "" : row.storedValue}
                          className="h-8 w-[140px] text-xs"
                          onChange={(e) => handleDetailDateChange(row, e.target.value)}
                        />
                      )
                    ) : (
                      <span className="text-xs font-medium text-foreground">
                        {row.disabled ? "N/A" : row.value ? formatTimelineDisplayDate(row.value) : "—"}
                      </span>
                    )}
                    {weekendNotes[row.fieldId] ? (
                      <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                        {weekendNotes[row.fieldId]}
                      </span>
                    ) : null}
                  </div>
                </td>
                {props.mode === "detail"
                  ? renderDetailNotesCell(timelineFieldNoteKey(row.fieldId), row.title)
                  : null}
                {props.mode === "detail" ? (
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {renderDetailNotesAction(timelineFieldNoteKey(row.fieldId), row.title)}
                      {props.canEdit && row.deadlineId && row.kind === "date" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          aria-label={row.formManaged ? "Clear deadline date" : "Delete deadline"}
                          onClick={() => props.onDeadlineDelete?.(row.deadlineId!, row.title, row.formManaged)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {customRows.map((item) => (
              <tr key={item.id} className="border-b border-border/60 bg-violet-500/[0.03] last:border-b-0">
                <td className="px-3 py-2 align-middle">
                  <div className="flex min-w-0 items-center gap-2">
                    {props.mode === "form" || (props.mode === "detail" && props.canEdit && !item.legacy) ? (
                      <Input
                        value={item.title}
                        onChange={(e) => handleCustomItemChange(item, { title: e.target.value })}
                        onBlur={() => {
                          if (props.mode === "detail" && !item.legacy) flushDetailCustomTimelineOnBlur();
                        }}
                        placeholder="Custom item title"
                        className="h-8 flex-1 text-xs"
                      />
                    ) : (
                      <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
                    )}
                    <span className="shrink-0 rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                      Custom
                    </span>
                    {(props.mode === "form" || (props.mode === "detail" && props.canEdit)) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive"
                        aria-label="Delete custom item"
                        onClick={() => handleCustomDelete(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {props.mode === "detail" ? (
                    <div className="mt-1">
                      {props.mode === "detail" && props.canEdit && !item.legacy ? (
                        <Select
                          value={item.kind}
                          onValueChange={(v) => handleCustomKindChange(item, v as "date" | "text")}
                        >
                          <SelectTrigger className="h-8 w-[92px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{item.kind === "date" ? "Date" : "Text"}</span>
                      )}
                    </div>
                  ) : null}
                </td>
                {props.mode === "form" ? (
                <td className="px-3 py-2 align-middle">
                  {props.mode === "form" || (props.mode === "detail" && props.canEdit && !item.legacy) ? (
                    <Select
                      value={item.kind}
                      onValueChange={(v) => handleCustomKindChange(item, v as "date" | "text")}
                    >
                      <SelectTrigger className="h-8 w-[92px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{item.kind === "date" ? "Date" : "Text"}</span>
                  )}
                </td>
                ) : null}
                <td className="px-3 py-2 align-middle">
                  {item.kind === "date" ? (
                    props.mode === "form" || (props.mode === "detail" && props.canEdit) ? (
                      <Input
                        type="date"
                        value={item.value}
                        className="h-8 text-xs"
                        onChange={(e) => handleCustomDateChange(item, e.target.value)}
                      />
                    ) : (
                      <span className="text-xs font-medium text-foreground">{item.value || "—"}</span>
                    )
                  ) : props.mode === "form" || (props.mode === "detail" && props.canEdit && !item.legacy) ? (
                    <Input
                      value={item.value}
                      onChange={(e) => handleCustomItemChange(item, { value: e.target.value })}
                      onBlur={() => {
                        if (props.mode === "detail" && !item.legacy) flushDetailCustomTimelineOnBlur();
                      }}
                      placeholder="Free text value"
                      className="h-8 text-xs"
                    />
                  ) : (
                    <span className="text-xs font-medium text-foreground">{item.value || "—"}</span>
                  )}
                </td>
                {props.mode === "detail"
                  ? renderDetailNotesCell(timelineCustomNoteKey(item.id), item.title)
                  : null}
                {props.mode === "detail" ? (
                  <td className="px-3 py-2 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      {renderDetailNotesAction(timelineCustomNoteKey(item.id), item.title)}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(props.mode === "form" || (props.mode === "detail" && props.canEdit)) &&
      (showAddCustom || !addCustomTriggerExternal) ? (
        <div className="space-y-2">
          {showAddCustom ? (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3">
              <div className="min-w-[160px] flex-1 space-y-1">
                <Label className="text-[11px] text-muted-foreground">Title</Label>
                <Input
                  value={newCustomTitle}
                  onChange={(e) => setNewCustomTitle(e.target.value)}
                  placeholder="e.g. Final walkthrough"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Type</Label>
                <Select value={newCustomKind} onValueChange={(v) => setNewCustomKind(v as "date" | "text")}>
                  <SelectTrigger className="h-8 w-[92px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label className="text-[11px] text-muted-foreground">{newCustomKind === "date" ? "Date" : "Value"}</Label>
                {newCustomKind === "date" ? (
                  <Input
                    type="date"
                    value={newCustomValue}
                    onChange={(e) => setNewCustomValue(e.target.value)}
                    className="h-8 text-xs"
                  />
                ) : (
                  <Input
                    value={newCustomValue}
                    onChange={(e) => setNewCustomValue(e.target.value)}
                    placeholder="Optional text"
                    className="h-8 text-xs"
                  />
                )}
              </div>
              <Button type="button" size="sm" className="h-8" onClick={handleAddCustomItem}>
                Add
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setShowAddCustom(false)}>
                Cancel
              </Button>
            </div>
          ) : !addCustomTriggerExternal ? (
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setShowAddCustom(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add custom timeline item
            </Button>
          ) : null}
        </div>
      ) : null}

      {props.mode === "form" ? (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Checkbox id="cop-toggle" checked={props.showCOP} onCheckedChange={(v) => props.onShowCOPChange(!!v)} />
            <Label htmlFor="cop-toggle" className="cursor-pointer text-sm">
              Add <strong>Contingency for the Sale of the Buyer&apos;s Property (COP)</strong> dates
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sprp-toggle" checked={props.showSPRP} onCheckedChange={(v) => props.onShowSPRPChange(!!v)} />
            <Label htmlFor="sprp-toggle" className="cursor-pointer text-sm">
              Add <strong>Seller Purchase of Replacement Property (SPRP)</strong> dates
            </Label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
