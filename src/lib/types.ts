// src/lib/types.ts
import type { DocumentData, QueryDocumentSnapshot, SnapshotOptions, Timestamp } from "firebase/firestore";

/** Common */
export type Difficulty = "easy" | "medium" | "hard";
export type Visibility = "public" | "unlisted" | "private";

export interface UserStats {
  puzzlesCreated: number;
  puzzlesPlayed: number;
  puzzlesCompleted: number;
}

export interface UserSettings {
  darkMode: boolean;
  emailNotifications: boolean;
}

export interface UserDoc {
  displayName: string;
  bio?: string;
  photoURL?: string;
  email?: string;                 // mirrored from Auth (not authoritative)
  providerIds?: string[];

  settings: UserSettings;
  stats: UserStats;
  pinned: string[];

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** ── N×N Puzzle types ─────────────────────────────────────────────────────── */
export interface PuzzleCategory {
  title: string;
  /** Each category contains `groupSize` words (usually equals gridSize). */
  words: string[]; // length === groupSize
}

export interface PuzzleStats {
  plays: number;
  completions: number;
  avgTimeSec: number;
  likes: number;
}

export interface CreatedBy {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface PuzzleDoc {
  title: string;
  description?: string;

  /** Size of board (rows/cols), e.g., 4, 5, 6… */
  gridSize: number;

  /**
   * Words per category. For classic square boards, set `groupSize === gridSize`.
   * Kept separate so you could support non-square groupings later if desired.
   */
  groupSize: number;

  /** Must have exactly `gridSize` categories. */
  categories: PuzzleCategory[];

  /** Must have exactly `gridSize * groupSize` words. */
  wordsFlat: string[];

  difficulty: Difficulty;
  tags?: string[];
  solutionHash?: string | null;

  createdBy: CreatedBy;
  visibility: Visibility;

  stats: PuzzleStats;
  isPublished: boolean;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  publishedAt?: Timestamp;
}

/** Subcollections */
export type PlayStatus = "in_progress" | "completed" | "failed";

export interface PlayGuess {
  /** A single guess of exactly `groupSize` words for the puzzle being played. */
  words: string[];
  correct: boolean;
  ts: Timestamp;
}

export interface PlayDoc {
  uid: string;
  status: PlayStatus;
  guesses: PlayGuess[];
  timeSpentSec: number;
  completedAt?: Timestamp | null;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ReactionDoc {
  type: "like";
  createdAt: Timestamp;
}

export interface CommentDoc {
  uid: string;
  text: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/** User-scoped collections */
export interface UserCollectionDoc {
  name: string;
  description?: string;
  puzzleIds: string[];
  isPublic: boolean;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** Activity feed */
export type ActivityType = "puzzle_created" | "puzzle_published" | "completed" | "comment";

export interface ActivityDoc {
  type: ActivityType;
  actor: CreatedBy;
  puzzleId?: string;
  visibility: Visibility;

  createdAt?: Timestamp;
}

/** Firestore helper types */
export type FromSnap<T> = (snap: QueryDocumentSnapshot, options?: SnapshotOptions) => T;
export type ToFirestore<T> = (value: T) => DocumentData;
