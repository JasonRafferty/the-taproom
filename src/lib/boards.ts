export type BoardType = "BUG" | "FEATURE" | "TASK";

export const BOARD_COLUMNS: Record<BoardType, string[]> = {
  BUG: ["To Do", "In Progress", "Ready to Test", "Ready for Release", "Released"],
  FEATURE: ["To Do", "In Progress", "Ready to Test", "Ready for Release", "Released"],
  TASK: ["To Do", "In Progress", "Done"],
};

export const TERMINAL_COLUMN: Record<BoardType, string> = {
  BUG: "Released",
  FEATURE: "Released",
  TASK: "Done",
};

export const BOARD_LABELS: Record<BoardType, string> = {
  BUG: "Bugs",
  FEATURE: "Features",
  TASK: "Tasks",
};

export const BOARD_PURPOSE: Record<BoardType, string> = {
  BUG: "Something broken in the live product? Log it, track it, watch it through to release.",
  FEATURE: "New ideas and in-progress features, from first idea to shipped.",
  TASK: "Everything else — admin, legal, funding, marketing, ops.",
};

export const BOARD_SLUGS: Record<BoardType, string> = {
  BUG: "bugs",
  FEATURE: "features",
  TASK: "tasks",
};

export const EMPTY_COLUMN_MESSAGE: Record<BoardType, Record<string, string>> = {
  BUG: {
    "To Do": "No bugs logged yet.",
    "In Progress": "Nothing being worked on yet.",
    "Ready to Test": "Nothing waiting on testing yet.",
    "Ready for Release": "Nothing ready to ship yet.",
    Released: "Nothing released yet — Siply hasn't launched.",
  },
  FEATURE: {
    "To Do": "No feature ideas logged yet.",
    "In Progress": "Nothing being worked on yet.",
    "Ready to Test": "Nothing waiting on testing yet.",
    "Ready for Release": "Nothing ready to ship yet.",
    Released: "Nothing released yet — Siply hasn't launched.",
  },
  TASK: {
    "To Do": "No tasks logged yet.",
    "In Progress": "Nothing being worked on yet.",
    Done: "Nothing completed yet.",
  },
};

export function isBoardType(value: string): value is BoardType {
  return value === "BUG" || value === "FEATURE" || value === "TASK";
}

export function slugToBoardType(slug: string): BoardType | null {
  const entry = (Object.entries(BOARD_SLUGS) as [BoardType, string][]).find(([, s]) => s === slug);
  return entry ? entry[0] : null;
}

export const USER_SUMMARY_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarColor: true,
} as const;
