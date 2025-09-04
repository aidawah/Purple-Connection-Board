export type GroupId = "A" | "B" | "C" | "D";

export interface Word {
  id: string;
  text: string;
  groupId: GroupId;
}

export interface Puzzle {
  id: string;
  title: string;
  words: Word[];
  createdAt?: number | string | Date | { seconds: number };
  ownerName?: string;
  ownerId?: string;
  isPublished?: boolean;
  assignees?: string[];
  completedBy?: string[];
  completions?: { user?: string; userId?: string }[];
}
