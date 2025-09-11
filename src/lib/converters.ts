// src/lib/converters.ts
import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue
} from "firebase/firestore";
import type {
  UserDoc,
  PuzzleDoc,
  PlayDoc,
  ReactionDoc,
  CommentDoc,
  UserCollectionDoc,
  ActivityDoc,
  Difficulty,
  Visibility
} from "./types";

// ---------- tiny validators ----------
function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
const isDifficulty = (x: unknown): x is Difficulty => x === "easy" || x === "medium" || x === "hard";
const isVisibility = (x: unknown): x is Visibility => x === "public" || x === "unlisted" || x === "private";

function validatePuzzle(p: PuzzleDoc) {
  // N×N checks
  assert(Number.isInteger(p.gridSize) && p.gridSize >= 2 && p.gridSize <= 10, "gridSize out of range (2..10)");
  assert(Number.isInteger(p.groupSize) && p.groupSize >= 2 && p.groupSize <= 10, "groupSize out of range (2..10)");

  assert(Array.isArray(p.categories) && p.categories.length === p.gridSize, "categories.length must equal gridSize");
  p.categories.forEach((c, i) => {
    assert(typeof c.title === "string" && c.title.trim().length > 0, `categories[${i}].title required`);
    assert(Array.isArray(c.words) && c.words.length === p.groupSize, `categories[${i}].words must have ${p.groupSize} items`);
  });

  assert(
    Array.isArray(p.wordsFlat) && p.wordsFlat.length === p.gridSize * p.groupSize,
    "wordsFlat length must equal gridSize * groupSize"
  );

  assert(isDifficulty(p.difficulty), "Invalid difficulty");
  assert(isVisibility(p.visibility), "Invalid visibility");
}

// ---------- helpers ----------
const passthroughFrom = <T>(snap: QueryDocumentSnapshot, _?: SnapshotOptions): T => snap.data() as T;
const passthroughTo = <T>(value: WithFieldValue<T>): DocumentData => value as unknown as DocumentData;

// ---------- converters ----------
export const userConverter: FirestoreDataConverter<UserDoc> = {
  toFirestore: passthroughTo,
  fromFirestore: passthroughFrom
};

export const puzzleConverter: FirestoreDataConverter<PuzzleDoc> = {
  toFirestore: (value: WithFieldValue<PuzzleDoc>) => {
    const maybe = value as PuzzleDoc;
    // Validate when the sizing fields are present (won't block partial merges)
    if (typeof maybe.gridSize === "number" && typeof maybe.groupSize === "number") {
      validatePuzzle(maybe);
    }
    return value as unknown as DocumentData;
  },
  fromFirestore: passthroughFrom
};

export const playConverter: FirestoreDataConverter<PlayDoc> = {
  toFirestore: passthroughTo,
  fromFirestore: passthroughFrom
};

export const reactionConverter: FirestoreDataConverter<ReactionDoc> = {
  toFirestore: passthroughTo,
  fromFirestore: passthroughFrom
};

export const commentConverter: FirestoreDataConverter<CommentDoc> = {
  toFirestore: passthroughTo,
  fromFirestore: passthroughFrom
};

export const userCollectionConverter: FirestoreDataConverter<UserCollectionDoc> = {
  toFirestore: passthroughTo,
  fromFirestore: passthroughFrom
};

export const activityConverter: FirestoreDataConverter<ActivityDoc> = {
  toFirestore: passthroughTo,
  fromFirestore: passthroughFrom
};

export const Converters = {
  users: userConverter,
  puzzles: puzzleConverter,
  plays: playConverter,
  reactions: reactionConverter,
  comments: commentConverter,
  userCollections: userCollectionConverter,
  activity: activityConverter
};
