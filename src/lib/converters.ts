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
  assert(isDifficulty(p.difficulty), "Invalid difficulty");
  assert(isVisibility(p.visibility), "Invalid visibility");
  assert(Array.isArray(p.categories) && p.categories.length === 4, "Puzzle must have 4 categories");
  p.categories.forEach((c, i) => {
    assert(Array.isArray(c.words) && c.words.length === 4, `Category ${i} must have 4 words`);
  });
  assert(Array.isArray(p.wordsFlat) && p.wordsFlat.length === 16, "wordsFlat must be 16 items");
}

// ---------- helpers ----------
const passthroughFrom = <T>(snap: QueryDocumentSnapshot, _?: SnapshotOptions): T =>
  snap.data() as T;
const passthroughTo = <T>(value: WithFieldValue<T>): DocumentData =>
  value as unknown as DocumentData;

// ---------- converters ----------
export const userConverter: FirestoreDataConverter<UserDoc> = {
  toFirestore: passthroughTo,
  fromFirestore: passthroughFrom
};

export const puzzleConverter: FirestoreDataConverter<PuzzleDoc> = {
  toFirestore: (value: WithFieldValue<PuzzleDoc>) => {
    // validate strictly when possible
    validatePuzzle(value as PuzzleDoc);
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
