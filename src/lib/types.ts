// src/lib/types.ts

// - Timestamp: Firestore's time value
// - QueryDocumentSnapshot / SnapshotOptions: used with data converters
import type {
	DocumentData,
	QueryDocumentSnapshot,
	SnapshotOptions,
	Timestamp
} from 'firebase/firestore';
import type { ThemeKey } from '$lib/themes/themes';

// Difficulty choices for a puzzle
export type Difficulty = 'easy' | 'medium' | 'hard';

// Visibility controls who can see a puzzle.
// - public: anyone
// - unlisted: only via direct link
// - private: only the owner or allowed users
export type Visibility = 'public' | 'unlisted' | 'private';

// Per-user aggregate numbers.
export interface UserStats {
	puzzlesCreated: number; // how many puzzles this user owns
	puzzlesPlayed: number; // how many puzzles they started
	puzzlesCompleted: number; // how many puzzles they finished
}

// User settings
export interface UserSettings {
	darkMode: boolean; // UI theme preference
	emailNotifications: boolean; // whether to receive email updates
}

// User Collection/Obj
export interface UserDoc {
	displayName: string; // display name
	bio?: string; // optional bio
	photoURL?: string; // optional avatar URL
	email?: string; // mirrored from Auth
	providerIds?: string[]; // ["google.com"]

	settings: UserSettings;
	stats: UserStats;
	pinned: string[];

	createdAt?: Timestamp;
	updatedAt?: Timestamp;
}

// Each puzzle category
export interface PuzzleCategory {
	title: string;
	words: string[]; // should have exactly `groupSize` items
}

// puzzle itself
export interface PuzzleStats {
	plays: number; // how many times people started this puzzle
	completions: number; // how many completions
	avgTimeSec: number; // average completion time in seconds
	likes: number; // number of "like" reactions
}

// snapshot of the author
export interface CreatedBy {
	uid: string;
	displayName: string;
	photoURL?: string;
}

// The main document shape for a single puzzle
export interface PuzzleDoc {
	title: string;
	description?: string;

	gridSize: number;

	/**
	 * Words per category. For classic square boards, set `groupSize === gridSize`.
	 * Kept separate so you could support non-square groupings later if desired.
	 */
	groupSize: number; // how many words belong to each category

	/** Must have exactly `gridSize` categories. */
	categories: PuzzleCategory[];

	/** Must have exactly `gridSize * groupSize` words. */
	wordsFlat: string[]; // flattened list of all words on the board

	difficulty: Difficulty; // "easy" | "medium" | "hard"
	tags?: string[]; // optional labels for filtering/search
	solutionHash?: string | null; // optional opaque hash of solution for validation
	theme?: ThemeKey; // optional theme for the puzzle

	createdBy: CreatedBy; // denormalized author info
	visibility: Visibility; // who can see this puzzle

	stats: PuzzleStats;
	isPublished: boolean; // whether it’s visible according to `visibility`

	createdAt?: Timestamp;
	updatedAt?: Timestamp;
	publishedAt?: Timestamp;
}

// user's play session
export type PlayStatus = 'in_progress' | 'completed' | 'failed';

export interface PlayGuess {
	/** A single guess of exactly `groupSize` words for the puzzle being played. */
	words: string[]; // the words the player selected for this guess
	correct: boolean; // whether that guess matched a category
	ts: Timestamp; // when the guess was made
}

// Tracks how a single user is doing on a single puzzle.
export interface PlayDoc {
	uid: string; // which user this play record belongs to
	status: PlayStatus; // current state of the playthrough
	guesses: PlayGuess[]; // all guesses made so far (in order)
	timeSpentSec: number; // accumulated time spent (client- or server-updated)
	completedAt?: Timestamp | null; // when they finished (if completed)

	createdAt?: Timestamp;
	updatedAt?: Timestamp;
}

// Reactions
export interface ReactionDoc {
	type: 'like';
	createdAt: Timestamp;
}

// Comments
export interface CommentDoc {
	uid: string;
	text: string;
	createdAt: Timestamp;
	updatedAt?: Timestamp;
}

// A named collection of puzzle IDs that a user curates
export interface UserCollectionDoc {
	name: string;
	description?: string;
	puzzleIds: string[];
	isPublic: boolean;

	createdAt?: Timestamp;
	updatedAt?: Timestamp;
}

// Activity Feed
export type ActivityType = 'puzzle_created' | 'puzzle_published' | 'completed' | 'comment';

// can be queried globally
// Each entry says who did what, optionally which puzzle, and when.
export interface ActivityDoc {
	type: ActivityType;
	actor: CreatedBy;
	puzzleId?: string;
	visibility: Visibility;

	createdAt?: Timestamp;
}

// Converter functions use these.
// - FromSnap<T>: read a snapshot and return a typed object
// - ToFirestore<T>: take a typed object and return a Firestore-friendly object
export type FromSnap<T> = (snap: QueryDocumentSnapshot, options?: SnapshotOptions) => T;
export type ToFirestore<T> = (value: T) => DocumentData;
