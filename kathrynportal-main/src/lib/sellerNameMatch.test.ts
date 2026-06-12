import { describe, expect, it } from "vitest";
import {
  autoSellerNameMatch,
  resolveEffectiveSellerMatchLabel,
  resolveSellerNameMatchStatus,
} from "./sellerNameMatch";

describe("sellerNameMatch", () => {
  it("auto-matches normalized seller names", () => {
    expect(autoSellerNameMatch("John Smith", "john smith")).toBe("yes");
    expect(autoSellerNameMatch("John A. Smith", "John A Smith")).toBe("yes");
    expect(autoSellerNameMatch("John Smith", "Jane Smith")).toBe("no");
    expect(autoSellerNameMatch("", "Jane Smith")).toBe("");
  });

  it("honors manual override over auto result", () => {
    expect(resolveSellerNameMatchStatus("yes", "A", "B")).toBe("yes");
    expect(resolveSellerNameMatchStatus("no", "John", "John")).toBe("no");
    expect(resolveSellerNameMatchStatus("", "John", "John")).toBe("yes");
  });

  it("formats effective labels", () => {
    expect(resolveEffectiveSellerMatchLabel("", "John", "John")).toBe("Yes");
    expect(resolveEffectiveSellerMatchLabel("", "John", "Jane")).toBe("No");
    expect(resolveEffectiveSellerMatchLabel("", "John", "")).toBe("Pending");
  });
});
