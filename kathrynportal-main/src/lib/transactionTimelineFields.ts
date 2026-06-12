import type { TransactionFieldHelp } from "@/lib/transactionFieldHelp";
import { TX_FIELD_HELP } from "@/lib/transactionFieldHelp";
import {
  addBusinessDays,
  addCalendarDays,
  adjustOffWeekend,
  normalizeTimelineDate,
} from "@/lib/businessDays";

export type TimelineDayType = "calendar" | "business";

export type TimelineFormState = {
  contractDate: string;
  acceptanceDate: string;
  preapproval: string;
  verificationOfFunds: string;
  emdToEscrow: string;
  sellerDisclosuresToBuyer: string;
  investigationContingency: string;
  insuranceContingency: string;
  reviewSellerDocs: string;
  reviewPrelim: string;
  reviewCommIntDiscl: string;
  appraisalContingency: string;
  loanContingency: string;
  verificationOfPropertyCondition: string;
  estimatedCOE: string;
  possession: string;
};

export type CopSprpState = { intoContract: string; coe: string };

export type TimelineEditorContext = {
  isAllCash: boolean;
  noHOA: boolean;
  hoaYes: boolean;
  showCOP: boolean;
  showSPRP: boolean;
};

/** Context for conditional required rules (4.4). */
export type TimelineRequiredContext = TimelineEditorContext & {
  /** Timeline step is visible / deadlines apply (Buyer File or listing post-contract). */
  timelineApplies: boolean;
  isBuyerFile: boolean;
};

export type TimelineFieldKind = "date" | "text";

export type TimelineFieldSection = "timeline" | "cop" | "sprp";

export type TimelineFieldDef = {
  id: keyof TimelineFormState | "copIntoContract" | "copCoe" | "sprpIntoContract" | "sprpCoe";
  title: string;
  kind: TimelineFieldKind;
  section: TimelineFieldSection;
  order: number;
  labelHelp?: TransactionFieldHelp;
  disabledHint?: string;
  isDisabled?: (ctx: TimelineEditorContext) => boolean;
  isRequired?: boolean | ((ctx: TimelineRequiredContext) => boolean);
  textHint?: string;
  defaultAnchorField?: TimelineFieldDef["id"];
  suggestedOffsetDays?: number;
  suggestedOffsetType?: TimelineDayType;
};

export type TimelineFieldId = TimelineFieldDef["id"];

export type TimelineFieldOffset = {
  days: number;
  dayType: TimelineDayType;
  anchorField: TimelineFieldId;
};

export type TimelineOffsetsState = Partial<Record<TimelineFieldId, TimelineFieldOffset>>;

export type CustomTimelineItem = {
  id: string;
  title: string;
  kind: TimelineFieldKind;
  value: string;
  /** Linked project_deadlines row when synced (detail view). */
  deadlineId?: string;
  /** Ad-hoc deadline not yet stored in metadata.customTimeline. */
  legacy?: boolean;
};

export type CustomTimelineState = CustomTimelineItem[];

export type TimelineEditorRow = {
  fieldId: TimelineFieldDef["id"];
  title: string;
  kind: TimelineFieldKind;
  /** Value from transaction metadata / form state only. */
  storedValue: string;
  /** Display value; may include synced deadline fallback for read-only detail rows. */
  value: string;
  disabled: boolean;
  disabledHint?: string;
  labelHelp?: TransactionFieldHelp;
  textHint?: string;
  formManaged: boolean;
  deadlineId?: string;
  offset?: TimelineFieldOffset;
  defaultAnchorField?: TimelineFieldDef["id"];
  suggestedOffsetDays?: number;
  suggestedOffsetType?: TimelineDayType;
  required: boolean;
};

export const DEFAULT_TIMELINE: TimelineFormState = {
  contractDate: "",
  acceptanceDate: "",
  preapproval: "",
  verificationOfFunds: "",
  emdToEscrow: "",
  sellerDisclosuresToBuyer: "",
  investigationContingency: "",
  insuranceContingency: "",
  reviewSellerDocs: "",
  reviewPrelim: "",
  reviewCommIntDiscl: "",
  appraisalContingency: "",
  loanContingency: "",
  verificationOfPropertyCondition: "Within 5 days prior to COE",
  estimatedCOE: "",
  possession: "Upon notice of recordation",
};

export const FORM_MANAGED_DEADLINE_TITLES = [
  "Contract Date",
  "Acceptance Date",
  "Preapproval",
  "Verification of Funds",
  "EMD to Escrow",
  "Seller Disclosures to Buyer",
  "Investigation Contingency Removal",
  "Insurance Contingency Removal",
  "Review of Seller Docs Contingency Removal",
  "Review of Prelim Contingency Removal",
  "Review of Comm Int Discl Contingency Removal",
  "Appraisal Contingency Removal",
  "Loan Contingency Removal",
  "Estimated COE",
  "COP — Into Contract",
  "COP — COE",
  "SPRP — Into Contract",
  "SPRP — COE",
] as const;

const ALL_CASH_HINT = "Auto N/A — All Cash";
const NO_HOA_HINT = "Auto N/A — No HOA";

export const TIMELINE_FIELD_DEFS: TimelineFieldDef[] = [
  {
    id: "contractDate",
    title: "Contract Date",
    kind: "date",
    section: "timeline",
    order: 10,
    isRequired: (ctx) => ctx.timelineApplies,
  },
  {
    id: "acceptanceDate",
    title: "Acceptance Date",
    kind: "date",
    section: "timeline",
    order: 20,
    isRequired: (ctx) => ctx.timelineApplies,
  },
  {
    id: "preapproval",
    title: "Preapproval",
    kind: "date",
    section: "timeline",
    order: 30,
    isDisabled: (ctx) => ctx.isAllCash,
    disabledHint: ALL_CASH_HINT,
    isRequired: (ctx) => ctx.timelineApplies && !ctx.isAllCash,
  },
  { id: "verificationOfFunds", title: "Verification of Funds", kind: "date", section: "timeline", order: 40 },
  { id: "emdToEscrow", title: "EMD to Escrow", kind: "date", section: "timeline", order: 50, labelHelp: TX_FIELD_HELP.emdToEscrow, defaultAnchorField: "acceptanceDate", suggestedOffsetDays: 3, suggestedOffsetType: "business" },
  {
    id: "estimatedCOE",
    title: "Estimated COE",
    kind: "date",
    section: "timeline",
    order: 60,
    labelHelp: TX_FIELD_HELP.estimatedCoe,
    isRequired: (ctx) => ctx.timelineApplies && ctx.isBuyerFile,
  },
  { id: "sellerDisclosuresToBuyer", title: "Seller Disclosures to Buyer", kind: "date", section: "timeline", order: 70, defaultAnchorField: "acceptanceDate", suggestedOffsetDays: 7, suggestedOffsetType: "calendar" },
  { id: "investigationContingency", title: "Investigation Contingency Removal", kind: "date", section: "timeline", order: 80, defaultAnchorField: "acceptanceDate", suggestedOffsetDays: 17, suggestedOffsetType: "calendar" },
  { id: "insuranceContingency", title: "Insurance Contingency Removal", kind: "date", section: "timeline", order: 90 },
  { id: "reviewSellerDocs", title: "Review of Seller Docs Contingency Removal", kind: "date", section: "timeline", order: 100 },
  {
    id: "reviewPrelim",
    title: "Review of Prelim Contingency Removal",
    kind: "date",
    section: "timeline",
    order: 110,
    labelHelp: TX_FIELD_HELP.reviewPrelim,
  },
  {
    id: "reviewCommIntDiscl",
    title: "Review of Comm Int Discl Contingency Removal",
    kind: "date",
    section: "timeline",
    order: 120,
    labelHelp: TX_FIELD_HELP.reviewCommIntDiscl,
    isDisabled: (ctx) => ctx.noHOA,
    disabledHint: NO_HOA_HINT,
    isRequired: (ctx) => ctx.timelineApplies && ctx.hoaYes,
  },
  { id: "appraisalContingency", title: "Appraisal Contingency Removal", kind: "date", section: "timeline", order: 130 },
  {
    id: "loanContingency",
    title: "Loan Contingency Removal",
    kind: "date",
    section: "timeline",
    order: 140,
    isDisabled: (ctx) => ctx.isAllCash,
    disabledHint: ALL_CASH_HINT,
    isRequired: (ctx) => ctx.timelineApplies && !ctx.isAllCash,
  },
  {
    id: "verificationOfPropertyCondition",
    title: "Verification of Property Condition",
    kind: "text",
    section: "timeline",
    order: 150,
    textHint: "Default: Within 5 days prior to COE",
  },
  {
    id: "possession",
    title: "Possession",
    kind: "text",
    section: "timeline",
    order: 160,
    textHint: "Default: Upon notice of recordation",
  },
  {
    id: "copIntoContract",
    title: "COP — Into Contract",
    kind: "date",
    section: "cop",
    order: 210,
    labelHelp: TX_FIELD_HELP.copIntoContract,
  },
  { id: "copCoe", title: "COP — COE", kind: "date", section: "cop", order: 220, labelHelp: TX_FIELD_HELP.copCoe },
  {
    id: "sprpIntoContract",
    title: "SPRP — Into Contract",
    kind: "date",
    section: "sprp",
    order: 310,
    labelHelp: TX_FIELD_HELP.sprpIntoContract,
  },
  { id: "sprpCoe", title: "SPRP — COE", kind: "date", section: "sprp", order: 320, labelHelp: TX_FIELD_HELP.sprpCoe },
];

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function parseTimelineFromMetadata(metadata: Record<string, unknown> | undefined): {
  timeline: TimelineFormState;
  cop: CopSprpState;
  sprp: CopSprpState;
  showCOP: boolean;
  showSPRP: boolean;
  timelineOffsets: TimelineOffsetsState;
  customTimeline: CustomTimelineState;
} {
  const tl = asRecord(metadata?.timeline);
  const copRaw = asRecord(metadata?.cop);
  const sprpRaw = asRecord(metadata?.sprp);
  return {
    timeline: { ...DEFAULT_TIMELINE, ...(tl as Partial<TimelineFormState> | null) },
    cop: {
      intoContract: str(copRaw?.intoContract),
      coe: str(copRaw?.coe),
    },
    sprp: {
      intoContract: str(sprpRaw?.intoContract),
      coe: str(sprpRaw?.coe),
    },
    showCOP: metadata?.showCOP === true,
    showSPRP: metadata?.showSPRP === true,
    timelineOffsets: parseTimelineOffsetsFromMetadata(metadata),
    customTimeline: parseCustomTimelineFromMetadata(metadata),
  };
}

export function parseCustomTimelineFromMetadata(
  metadata: Record<string, unknown> | undefined,
): CustomTimelineState {
  const raw = metadata?.customTimeline;
  if (!Array.isArray(raw)) return [];

  const out: CustomTimelineState = [];
  for (const entry of raw) {
    const row = asRecord(entry);
    if (!row) continue;
    const id = str(row.id);
    const title = str(row.title);
    const kind = row.kind === "text" ? "text" : row.kind === "date" ? "date" : null;
    const value = str(row.value);
    if (!id || !title || !kind) continue;
    out.push({ id, title, kind, value });
  }
  return out;
}

export function createCustomTimelineItem(
  title: string,
  kind: TimelineFieldKind,
  value = "",
): CustomTimelineItem {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return { id, title: title.trim(), kind, value };
}

export function applyCustomTimelineItemChange(
  items: CustomTimelineState,
  itemId: string,
  patch: Partial<Pick<CustomTimelineItem, "title" | "kind" | "value">>,
): CustomTimelineState {
  return items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
}

export function applyCustomTimelineDateInput(
  items: CustomTimelineState,
  itemId: string,
  rawDate: string,
): CustomTimelineState & { weekendNote?: string } {
  const normalized = rawDate.trim() ? normalizeTimelineDate(rawDate) : { date: "", adjusted: false };
  const next = applyCustomTimelineItemChange(items, itemId, { value: normalized.date });
  return {
    ...next,
    ...(normalized.note ? { weekendNote: normalized.note } : {}),
  };
}

export function removeCustomTimelineItem(items: CustomTimelineState, itemId: string): CustomTimelineState {
  return items.filter((item) => item.id !== itemId);
}

/** Detail tab: metadata items plus legacy ad-hoc deadlines not yet in customTimeline. */
export function mergeCustomTimelineWithDeadlines(
  customTimeline: CustomTimelineState,
  deadlines: Array<{ id: string; title: string; date: string; formManaged?: boolean }> = [],
): CustomTimelineState {
  const titles = new Set(customTimeline.map((item) => item.title.trim().toLowerCase()));
  const merged = customTimeline.map((item) => {
    if (item.kind !== "date") return item;
    const dl = deadlines.find(
      (d) => !d.formManaged && d.title.trim().toLowerCase() === item.title.trim().toLowerCase(),
    );
    return dl ? { ...item, deadlineId: dl.id, value: item.value || dl.date } : item;
  });

  for (const dl of deadlines) {
    if (dl.formManaged || !dl.date?.trim()) continue;
    const key = dl.title.trim().toLowerCase();
    if (titles.has(key)) continue;
    merged.push({
      id: `deadline-${dl.id}`,
      title: dl.title,
      kind: "date",
      value: dl.date,
      deadlineId: dl.id,
      legacy: true,
    });
  }
  return merged;
}

export function serializeCustomTimelineForMetadata(items: CustomTimelineState): CustomTimelineState {
  return items
    .filter((item) => !item.legacy && item.title.trim())
    .map(({ id, title, kind, value }) => ({ id, title: title.trim(), kind, value: value.trim() }));
}

export function parseTimelineOffsetsFromMetadata(
  metadata: Record<string, unknown> | undefined,
): TimelineOffsetsState {
  const raw = asRecord(metadata?.timelineOffsets);
  if (!raw) return {};

  const out: TimelineOffsetsState = {};
  for (const def of TIMELINE_FIELD_DEFS) {
    if (def.kind !== "date") continue;
    const entry = asRecord(raw[def.id]);
    if (!entry) continue;
    const days = Number(entry.days);
    const dayType = entry.dayType === "business" ? "business" : entry.dayType === "calendar" ? "calendar" : null;
    const anchorField = str(entry.anchorField) as TimelineFieldId;
    if (!Number.isFinite(days) || days <= 0 || !dayType || !anchorField) continue;
    if (!TIMELINE_FIELD_DEFS.some((d) => d.id === anchorField && d.kind === "date")) continue;
    out[def.id] = { days: Math.floor(days), dayType, anchorField };
  }
  return out;
}

export function getTimelineFieldDef(fieldId: TimelineFieldId): TimelineFieldDef | undefined {
  return TIMELINE_FIELD_DEFS.find((d) => d.id === fieldId);
}

export function getAnchorFieldLabel(fieldId: TimelineFieldId): string {
  return getTimelineFieldDef(fieldId)?.title ?? fieldId;
}

export type TimelineStateBundle = {
  timeline: TimelineFormState;
  cop: CopSprpState;
  sprp: CopSprpState;
  offsets: TimelineOffsetsState;
};

export function computeDateFromOffset(
  anchorValue: string,
  offset: TimelineFieldOffset,
): string | null {
  if (!anchorValue.trim() || offset.days <= 0) return null;
  const raw =
    offset.dayType === "business"
      ? addBusinessDays(anchorValue, offset.days)
      : addCalendarDays(anchorValue, offset.days);
  if (!raw) return null;
  return normalizeTimelineDate(raw).date;
}

function setFieldValue(
  bundle: TimelineStateBundle,
  fieldId: TimelineFieldId,
  value: string,
): TimelineStateBundle {
  const next = applyTimelineFieldChange(fieldId, value, bundle);
  return { ...next, offsets: bundle.offsets };
}

function clearFieldOffset(offsets: TimelineOffsetsState, fieldId: TimelineFieldId): TimelineOffsetsState {
  if (!offsets[fieldId]) return offsets;
  const next = { ...offsets };
  delete next[fieldId];
  return next;
}

/** Manual date entry: normalize weekend, clear offset on this field, recalc dependents if anchor. */
export function applyTimelineDateInput(
  fieldId: TimelineFieldId,
  rawDate: string,
  current: TimelineStateBundle,
): TimelineStateBundle & { weekendNote?: string } {
  const normalized = rawDate.trim() ? normalizeTimelineDate(rawDate) : { date: "", adjusted: false };
  let bundle: TimelineStateBundle = {
    ...setFieldValue(current, fieldId, normalized.date),
    offsets: clearFieldOffset(current.offsets, fieldId),
  };

  if (normalized.date) {
    bundle = recalculateDependentOffsets(fieldId, bundle);
  }

  return {
    ...bundle,
    ...(normalized.note ? { weekendNote: normalized.note } : {}),
  };
}

export function applyTimelineOffsetInput(
  fieldId: TimelineFieldId,
  partial: { days?: string | number; dayType?: TimelineDayType; anchorField?: TimelineFieldId },
  current: TimelineStateBundle,
): TimelineStateBundle {
  const def = getTimelineFieldDef(fieldId);
  const existing = current.offsets[fieldId];
  const daysRaw = partial.days !== undefined ? Number(partial.days) : existing?.days ?? 0;
  const days = Number.isFinite(daysRaw) ? Math.max(0, Math.floor(daysRaw)) : 0;
  const dayType = partial.dayType ?? existing?.dayType ?? def?.suggestedOffsetType ?? "calendar";
  const anchorField =
    partial.anchorField ?? existing?.anchorField ?? def?.defaultAnchorField ?? "acceptanceDate";

  if (days <= 0) {
    const offsets = clearFieldOffset(current.offsets, fieldId);
    return { ...setFieldValue(current, fieldId, ""), offsets };
  }

  const offsets: TimelineOffsetsState = {
    ...current.offsets,
    [fieldId]: { days, dayType, anchorField },
  };
  const anchorValue = readTimelineFieldValue(anchorField, current.timeline, current.cop, current.sprp);
  const computed = computeDateFromOffset(anchorValue, offsets[fieldId]!);
  const bundle = computed
    ? setFieldValue({ ...current, offsets }, fieldId, computed)
    : { ...current, offsets };

  return bundle;
}

/** When an anchor date changes, recompute all fields offset from it. */
export function recalculateDependentOffsets(
  anchorFieldId: TimelineFieldId,
  current: TimelineStateBundle,
): TimelineStateBundle {
  let bundle = current;
  for (const [targetId, offset] of Object.entries(current.offsets) as [TimelineFieldId, TimelineFieldOffset][]) {
    if (offset.anchorField !== anchorFieldId) continue;
    const anchorValue = readTimelineFieldValue(anchorFieldId, bundle.timeline, bundle.cop, bundle.sprp);
    const computed = computeDateFromOffset(anchorValue, offset);
    bundle = setFieldValue(bundle, targetId, computed ?? "");
  }
  return bundle;
}

export function normalizeTimelineDateForSave(iso: string): string {
  if (!iso.trim()) return "";
  return normalizeTimelineDate(iso).date;
}

export function getTimelineEditorContext(metadata: Record<string, unknown> | undefined): TimelineEditorContext {
  const tx = asRecord(metadata?.transaction);
  const prop = asRecord(metadata?.property);
  const parsed = parseTimelineFromMetadata(metadata);
  return {
    isAllCash: str(tx?.loanType) === "All Cash",
    noHOA: str(prop?.hoa) === "no",
    hoaYes: str(prop?.hoa) === "yes",
    showCOP: parsed.showCOP,
    showSPRP: parsed.showSPRP,
  };
}

export function readTimelineFieldValue(
  fieldId: TimelineFieldDef["id"],
  timeline: TimelineFormState,
  cop: CopSprpState,
  sprp: CopSprpState,
): string {
  if (fieldId === "copIntoContract") return cop.intoContract;
  if (fieldId === "copCoe") return cop.coe;
  if (fieldId === "sprpIntoContract") return sprp.intoContract;
  if (fieldId === "sprpCoe") return sprp.coe;
  return timeline[fieldId as keyof TimelineFormState] ?? "";
}

export function getTimelineFieldTitle(fieldId: TimelineFieldDef["id"]): string | undefined {
  return TIMELINE_FIELD_DEFS.find((def) => def.id === fieldId)?.title;
}

function sectionVisible(section: TimelineFieldSection, ctx: TimelineEditorContext): boolean {
  if (section === "cop") return ctx.showCOP;
  if (section === "sprp") return ctx.showSPRP;
  return true;
}

export function resolveTimelineFieldRequired(
  def: TimelineFieldDef,
  ctx: TimelineRequiredContext,
): boolean {
  if (!ctx.timelineApplies) return false;
  if (def.isDisabled?.(ctx)) return false;
  if (typeof def.isRequired === "function") return def.isRequired(ctx);
  return def.isRequired === true;
}

export type TimelineRequiredValidationItem = {
  key: string;
  label: string;
  valid: boolean;
  message: string;
  fieldId: TimelineFieldId;
};

export function getTimelineRequiredValidationItems(
  bundle: { timeline: TimelineFormState; cop: CopSprpState; sprp: CopSprpState },
  ctx: TimelineRequiredContext,
): TimelineRequiredValidationItem[] {
  return TIMELINE_FIELD_DEFS.filter((def) => sectionVisible(def.section, ctx))
    .filter((def) => resolveTimelineFieldRequired(def, ctx))
    .map((def) => {
      const value = readTimelineFieldValue(def.id, bundle.timeline, bundle.cop, bundle.sprp);
      return {
        key: `timeline-${def.id}`,
        label: def.title,
        valid: Boolean(value.trim()),
        message: `${def.title} is required.`,
        fieldId: def.id,
      };
    });
}

export function buildTimelineRequiredContext(
  metadata: Record<string, unknown> | undefined,
  opts?: { isBuyerFile?: boolean; timelineApplies?: boolean },
): TimelineRequiredContext {
  const editorCtx = getTimelineEditorContext(metadata);
  const tx = metadata?.transaction;
  const txRecord = tx && typeof tx === "object" && !Array.isArray(tx) ? (tx as Record<string, unknown>) : null;
  const isListing = txRecord?.type === "Listing" || metadata?.type === "Listing";
  const contractAccepted = metadata?.contractAccepted === true;
  const timelineApplies = opts?.timelineApplies ?? (!isListing || contractAccepted);
  const isBuyerFile = opts?.isBuyerFile ?? !isListing;
  return { ...editorCtx, timelineApplies, isBuyerFile };
}

export function buildTimelineEditorRows(input: {
  timeline: TimelineFormState;
  cop: CopSprpState;
  sprp: CopSprpState;
  context: TimelineEditorContext;
  requiredContext?: TimelineRequiredContext;
  offsets?: TimelineOffsetsState;
  deadlines?: Array<{ id: string; title: string; date: string; formManaged?: boolean }>;
}): TimelineEditorRow[] {
  const requiredContext: TimelineRequiredContext = input.requiredContext ?? {
    ...input.context,
    timelineApplies: true,
    isBuyerFile: true,
  };
  const deadlineByTitle = new Map(
    (input.deadlines ?? []).map((d) => [d.title.trim(), d]),
  );

  return TIMELINE_FIELD_DEFS.filter((def) => sectionVisible(def.section, input.context))
    .sort((a, b) => a.order - b.order)
    .map((def) => {
      const disabled = def.isDisabled?.(input.context) ?? false;
      const dl = deadlineByTitle.get(def.title);
      const storedValue = readTimelineFieldValue(def.id, input.timeline, input.cop, input.sprp);
      const formManaged = FORM_MANAGED_DEADLINE_TITLES.includes(
        def.title as (typeof FORM_MANAGED_DEADLINE_TITLES)[number],
      );
      const value =
        storedValue || (def.kind === "date" && formManaged ? (dl?.date ?? "") : storedValue);
      return {
        fieldId: def.id,
        title: def.title,
        kind: def.kind,
        storedValue,
        value,
        disabled,
        disabledHint: def.disabledHint,
        labelHelp: def.labelHelp,
        textHint: def.textHint,
        formManaged,
        deadlineId: dl?.id,
        offset: input.offsets?.[def.id],
        defaultAnchorField: def.defaultAnchorField,
        suggestedOffsetDays: def.suggestedOffsetDays,
        suggestedOffsetType: def.suggestedOffsetType,
        required: resolveTimelineFieldRequired(def, requiredContext),
      };
    });
}

export function applyTimelineFieldChange(
  fieldId: TimelineFieldDef["id"],
  value: string,
  current: {
    timeline: TimelineFormState;
    cop: CopSprpState;
    sprp: CopSprpState;
  },
): { timeline: TimelineFormState; cop: CopSprpState; sprp: CopSprpState } {
  if (fieldId === "copIntoContract") {
    return { ...current, cop: { ...current.cop, intoContract: value } };
  }
  if (fieldId === "copCoe") {
    return { ...current, cop: { ...current.cop, coe: value } };
  }
  if (fieldId === "sprpIntoContract") {
    return { ...current, sprp: { ...current.sprp, intoContract: value } };
  }
  if (fieldId === "sprpCoe") {
    return { ...current, sprp: { ...current.sprp, coe: value } };
  }
  return {
    ...current,
    timeline: { ...current.timeline, [fieldId]: value },
  };
}

export function parseSortDate(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const year = slash[3]!.length === 2 ? 2000 + Number(slash[3]) : Number(slash[3]);
    const parsed = new Date(year, Number(slash[1]) - 1, Number(slash[2]));
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export type TimelineOverviewRow = {
  title: string;
  value: string;
  sortDate: number | null;
  isTextField?: boolean;
  offsetLabel?: string;
};

export function formatTimelineOffsetLabel(offset: TimelineFieldOffset): string {
  const unit = offset.dayType === "business" ? "business" : "calendar";
  return `+${offset.days} ${unit} days from ${getAnchorFieldLabel(offset.anchorField)}`;
}

/** Overview / print: dated rows sorted chronologically, text fields last. */
export function buildOverviewTimelineRows(
  metadata: Record<string, unknown> | undefined,
  deadlines: Array<{ title: string; date: string }> = [],
): TimelineOverviewRow[] {
  const parsed = parseTimelineFromMetadata(metadata);
  const ctx = getTimelineEditorContext(metadata);
  const editorRows = buildTimelineEditorRows({
    ...parsed,
    context: ctx,
    offsets: parsed.timelineOffsets,
    deadlines: deadlines.map((d, i) => ({ ...d, id: String(i) })),
  });

  const seenTitles = new Set<string>();
  const rows: TimelineOverviewRow[] = [];

  for (const row of editorRows) {
    if (!row.value.trim() || row.disabled) continue;
    seenTitles.add(row.title);
    rows.push({
      title: row.title,
      value: row.value,
      sortDate: row.kind === "date" ? parseSortDate(row.value) : null,
      isTextField: row.kind === "text",
      offsetLabel:
        row.kind === "date" && row.offset && row.offset.days > 0
          ? formatTimelineOffsetLabel(row.offset)
          : undefined,
    });
  }

  const customTimeline = parseCustomTimelineFromMetadata(metadata);
  for (const item of customTimeline) {
    if (!item.value.trim()) continue;
    const title = item.title.trim();
    if (!title || seenTitles.has(title)) continue;
    seenTitles.add(title);
    rows.push({
      title,
      value: item.value,
      sortDate: item.kind === "date" ? parseSortDate(item.value) : null,
      isTextField: item.kind === "text",
    });
  }

  for (const d of deadlines) {
    const title = d.title?.trim();
    const date = d.date?.trim();
    if (!title || !date || seenTitles.has(title)) continue;
    seenTitles.add(title);
    rows.push({ title, value: date, sortDate: parseSortDate(date) });
  }

  const dated = rows.filter((r) => r.sortDate !== null && !r.isTextField);
  const undated = rows.filter((r) => r.sortDate === null && !r.isTextField);
  const text = rows.filter((r) => r.isTextField);
  dated.sort((a, b) => (a.sortDate ?? 0) - (b.sortDate ?? 0));
  return [...dated, ...undated, ...text];
}

export function formatTimelineDisplayDate(value: string): string {
  const parsed = parseSortDate(value);
  if (parsed === null) return value;
  return new Date(parsed).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

/** Plain-text timeline block for email bodies and {{timeline_table}} token. */
export function buildTimelineTableText(
  metadata: Record<string, unknown> | undefined,
  deadlines: Array<{ title: string; date: string }> = [],
): string {
  const rows = buildOverviewTimelineRows(metadata, deadlines);
  if (rows.length === 0) return "No timeline dates or values are set for this transaction.";
  return rows
    .map((row) => {
      const display = row.isTextField ? row.value : formatTimelineDisplayDate(row.value);
      return `• ${row.title}: ${display}`;
    })
    .join("\n");
}
