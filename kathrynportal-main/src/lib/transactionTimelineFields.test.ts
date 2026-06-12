import { describe, expect, it } from "vitest";
import {
  applyTimelineDateInput,
  applyTimelineFieldChange,
  applyTimelineOffsetInput,
  buildTimelineEditorRows,
  buildOverviewTimelineRows,
  buildTimelineTableText,
  DEFAULT_TIMELINE,
  getTimelineRequiredValidationItems,
  createCustomTimelineItem,
  parseCustomTimelineFromMetadata,
  serializeCustomTimelineForMetadata,
  resolveTimelineFieldRequired,
} from "./transactionTimelineFields";

describe("transactionTimelineFields", () => {
  const buyerCtx = {
    isAllCash: false,
    noHOA: false,
    hoaYes: true,
    showCOP: false,
    showSPRP: false,
    timelineApplies: true,
    isBuyerFile: true,
  };

  it("updates only one timeline field", () => {
    const timeline = { ...DEFAULT_TIMELINE };
    const cop = { intoContract: "", coe: "" };
    const sprp = { intoContract: "", coe: "" };
    const ctx = { isAllCash: true, noHOA: false, hoaYes: false, showCOP: false, showSPRP: false };

    const next = applyTimelineFieldChange("contractDate", "2026-06-09", { timeline, cop, sprp });
    expect(next.timeline.contractDate).toBe("2026-06-09");
    expect(next.timeline.acceptanceDate).toBe("");

    const rows = buildTimelineEditorRows({
      timeline: next.timeline,
      cop: next.cop,
      sprp: next.sprp,
      context: ctx,
      requiredContext: { ...ctx, timelineApplies: true, isBuyerFile: true },
    });
    expect(rows.find((r) => r.fieldId === "contractDate")?.storedValue).toBe("2026-06-09");
    expect(rows.find((r) => r.fieldId === "contractDate")?.required).toBe(true);
  });

  it("computes offset dates from anchor", () => {
    const bundle = applyTimelineOffsetInput(
      "investigationContingency",
      { days: 17, dayType: "calendar", anchorField: "acceptanceDate" },
      {
        timeline: { ...DEFAULT_TIMELINE, acceptanceDate: "2026-06-01" },
        cop: { intoContract: "", coe: "" },
        sprp: { intoContract: "", coe: "" },
        offsets: {},
      },
    );
    expect(bundle.timeline.investigationContingency).toBe("2026-06-18");
    expect(bundle.offsets.investigationContingency?.days).toBe(17);
  });

  it("adjusts weekend manual dates", () => {
    const bundle = applyTimelineDateInput("preapproval", "2026-06-27", {
      timeline: { ...DEFAULT_TIMELINE },
      cop: { intoContract: "", coe: "" },
      sprp: { intoContract: "", coe: "" },
      offsets: {},
    });
    expect(bundle.timeline.preapproval).toBe("2026-06-26");
    expect(bundle.weekendNote).toContain("Saturday");
  });

  it("skips loan fields when all cash", () => {
    const allCashCtx = { ...buyerCtx, isAllCash: true };
    const items = getTimelineRequiredValidationItems(
      { timeline: DEFAULT_TIMELINE, cop: { intoContract: "", coe: "" }, sprp: { intoContract: "", coe: "" } },
      allCashCtx,
    );
    expect(items.some((i) => i.fieldId === "preapproval")).toBe(false);
    expect(items.some((i) => i.fieldId === "loanContingency")).toBe(false);
    expect(items.some((i) => i.fieldId === "contractDate")).toBe(true);
  });

  it("requires comm int discl only when HOA is yes", () => {
    const noHoaCtx = { ...buyerCtx, hoaYes: false, noHOA: true };
    expect(resolveTimelineFieldRequired(
      { id: "reviewCommIntDiscl", title: "Review of Comm Int Discl Contingency Removal", kind: "date", section: "timeline", order: 120, isDisabled: (c) => c.noHOA, isRequired: (c) => c.timelineApplies && c.hoaYes },
      noHoaCtx,
    )).toBe(false);
    expect(resolveTimelineFieldRequired(
      { id: "reviewCommIntDiscl", title: "Review of Comm Int Discl Contingency Removal", kind: "date", section: "timeline", order: 120, isDisabled: (c) => c.noHOA, isRequired: (c) => c.timelineApplies && c.hoaYes },
      buyerCtx,
    )).toBe(true);
  });

  it("parses and serializes custom timeline metadata", () => {
    const item = createCustomTimelineItem("Final walkthrough", "date", "2026-06-10");
    const metadata = { customTimeline: [item] };
    const parsed = parseCustomTimelineFromMetadata(metadata);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.title).toBe("Final walkthrough");
    expect(serializeCustomTimelineForMetadata([{ ...item, legacy: true }])).toHaveLength(0);
    expect(serializeCustomTimelineForMetadata([item])).toEqual([item]);
  });

  it("builds plain-text timeline table for email", () => {
    const metadata = {
      timeline: { contractDate: "2026-05-01", acceptanceDate: "2026-05-02" },
      customTimeline: [createCustomTimelineItem("Notes", "text", "Call escrow Monday")],
    };
    const text = buildTimelineTableText(metadata, [{ title: "Custom deadline", date: "2026-05-15" }]);
    expect(text).toContain("Contract Date:");
    expect(text).toContain("Acceptance Date:");
    expect(text).toContain("Notes: Call escrow Monday");
  });

  it("includes offset labels in overview/print rows", () => {
    const metadata = {
      timeline: { acceptanceDate: "2026-05-01", preapproval: "2026-05-18" },
      timelineOffsets: {
        preapproval: { days: 17, dayType: "business", anchorField: "acceptanceDate" },
      },
    };
    const rows = buildOverviewTimelineRows(metadata, []);
    const preapproval = rows.find((r) => r.title === "Preapproval");
    expect(preapproval?.offsetLabel).toContain("17 business days");
    expect(preapproval?.offsetLabel).toContain("Acceptance Date");
  });
});
