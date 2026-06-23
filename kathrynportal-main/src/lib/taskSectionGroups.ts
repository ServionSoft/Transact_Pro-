import type { ProjectTask } from "@/types/domain";

export type TaskSectionGroup = {
  section: string;
  tasks: ProjectTask[];
};

/** Group Compass-seeded tasks by section; preserves sort order within each section. */
export function groupTasksBySection(tasks: ProjectTask[]): TaskSectionGroup[] {
  const bySection = new Map<string, ProjectTask[]>();
  for (const task of tasks) {
    const section = task.taskSection?.trim() || "General";
    const list = bySection.get(section) ?? [];
    list.push(task);
    bySection.set(section, list);
  }

  const groups: TaskSectionGroup[] = [];
  for (const [section, sectionTasks] of bySection.entries()) {
    groups.push({
      section,
      tasks: [...sectionTasks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    });
  }

  groups.sort((a, b) => {
    const aMin = Math.min(...a.tasks.map((t) => t.sortOrder ?? 999_999));
    const bMin = Math.min(...b.tasks.map((t) => t.sortOrder ?? 999_999));
    if (aMin !== bMin) return aMin - bMin;
    return a.section.localeCompare(b.section);
  });

  return groups;
}

export function hasTaskSections(tasks: ProjectTask[]): boolean {
  return tasks.some((t) => Boolean(t.taskSection?.trim()));
}
