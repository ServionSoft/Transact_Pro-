import { describe, expect, it } from "vitest";
import { groupTasksBySection } from "./taskSectionGroups";
import type { ProjectTask } from "@/types/domain";

describe("groupTasksBySection", () => {
  it("groups and sorts by section and sortOrder", () => {
    const tasks: ProjectTask[] = [
      { id: "1", title: "B", stage: "In Escrow", status: "Pending", dueDate: "", taskSection: "Timeline", sortOrder: 200 },
      { id: "2", title: "A", stage: "Listing Prep", status: "Pending", dueDate: "", taskSection: "New Listing", sortOrder: 100 },
      { id: "3", title: "C", stage: "In Escrow", status: "Pending", dueDate: "", taskSection: "Timeline", sortOrder: 100 },
    ];
    const groups = groupTasksBySection(tasks);
    expect(groups).toHaveLength(2);
    expect(groups[0].section).toBe("New Listing");
    expect(groups[1].section).toBe("Timeline");
    expect(groups[1].tasks.map((t) => t.title)).toEqual(["C", "B"]);
  });
});
