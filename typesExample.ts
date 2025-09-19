import type {
	Timestamp,
	FirestoreDataConverter,
	QueryDocumentSnapshot,
	SnapshotOptions,
	DocumentData
} from 'firebase/firestore';

// Primitive Aliases

export type UID = string;
export type DocID = string;

// Firestore timestamp alias for clarity in your domain types
export type FSTimestamp = Timestamp;

// Utility Types

type Tuple4<T> = [T, T, T, T];

// Server-controlled timestamps
export type WithTimestamps = {
	createdAt: FSTimestamp;
	updatedAt: FSTimestamp;
};

// publishedAt for things that become publicly visible
export type WithPublish = {
	publishedAt?: FSTimestamp;
};

// Core Domain Types

// Users
export type UserDoc = WithTimestamps & {
	displayName: string;
	bio?: string;
	photoURL?: string;
	email?: string;
	providerIds?: string[]; // google auth is one

	settings: {
		darkMode: boolean;
		emailNotifications: boolean;
	};

	stats: {
		puzzlesCreated: number;
		puzzlesPlayed: number;
		puzzlesCompleted: number;
	};

	pinned: DocID[];
};

// Puzzle parts
export type Category = {
	title: string;
	// exactly 4 words
	words: Tuple4<string>;
};

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Visibility = 'public' | 'unlisted' | 'private';

export type PuzzleStats = {
	plays: number;
	completions: number;
	avgTimeSec?: number;
	likes?: number;
};

export type PuzzleDoc = WithTimestamps &
	WithPublish & {
		title: string;
		description?: string;
		categories: Tuple4<Category>;
		wordsFlat?: Tuple4<string> | string[]; // must be 16 words total if provided
		solutionHash?: string;
		difficulty?: Difficulty;
		tags?: string[];

		createdBy: {
			uid: UID;
			displayName: string;
			photoURL?: string;
		};

		visibility: Visibility;
		stats: PuzzleStats;
	};

// sessions per puzzle subcollection
export type Guess = {
	words: string[]; // 4 words per guess in UI
	correct: boolean;
	ts: FSTimestamp;
};

export type PlayStatus = 'in_progress' | 'completed' | 'failed';

export type PlayDoc = WithTimestamps & {
	uid: UID;
	status: PlayStatus;
	guesses: Guess[];
	timeSpentSec?: number;
	completedAt?: FSTimestamp | null;
};

// Likes per puzzle subcollection
export type ReactionDoc = {
	type: 'like';
	createdAt: FSTimestamp;
};

// Comments per puzzle subcollection
export type CommentDoc = WithTimestamps & {
	uid: UID;
	body: string;
	author?: { displayName?: string; photoURL?: string };
};

// User collections
export type UserCollectionDoc = WithTimestamps & {
	name: string;
	description?: string;
	puzzleIds: DocID[];
	isPublic: boolean;
};

// Activity
export type ActivityType = 'puzzle_created' | 'puzzle_published' | 'completed' | 'comment';

export type ActivityDoc = {
	type: ActivityType;
	actor: { uid: UID; displayName: string; photoURL?: string };
	puzzleId?: DocID;
	visibility: Visibility;
	createdAt: FSTimestamp; // feed ordering timestamp
};

// Optional global pins (server/admin only)
export type PinDoc = {
	type: 'puzzle';
	targetId: DocID;
	priority?: number;
	createdAt: FSTimestamp;
};

// Collection Path Constants
export const COL_USERS = 'users';
export const COL_PUZZLES = 'puzzles';
export const SUB_PLAYS = 'plays';
export const SUB_REACTIONS = 'reactions';
export const SUB_COMMENTS = 'comments';
export const COL_ACTIVITY = 'activity';
export const COL_PINS = 'pins';
export const SUB_COLLECTIONS = 'collections'; // nested under users/{uid}

// Firestore Converters
// Use to get typed docs: `withConverter(userConverter)` etc.
// Example: getDoc(doc(db, COL_USERS, uid).withConverter(userConverter))
function createConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
	return {
		toFirestore(data: T): DocumentData {
			return data;
		},
		fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
			return snapshot.data(options) as T;
		}
	};
}

export const userConverter = createConverter<UserDoc>();
export const puzzleConverter = createConverter<PuzzleDoc>();
export const playConverter = createConverter<PlayDoc>();
export const reactionConverter = createConverter<ReactionDoc>();
export const commentConverter = createConverter<CommentDoc>();
export const userCollectionConverter = createConverter<UserCollectionDoc>();
export const activityConverter = createConverter<ActivityDoc>();
export const pinConverter = createConverter<PinDoc>();

// OPTIONAL

// narrow update types
// These can help when doing partial updates like incrementing stats, etc.

export type PuzzleStatsUpdate = Partial<PuzzleStats>;
export type UserStatsUpdate = Partial<UserDoc['stats']>;
export type UserSettingsUpdate = Partial<UserDoc['settings']>;

// Force puzzle shape integrity in code paths that construct a new puzzle.
export type NewPuzzleInput = Omit<
	PuzzleDoc,
	'createdAt' | 'updatedAt' | 'publishedAt' | 'stats'
> & {
	stats?: Partial<PuzzleStats>; // start empty
};

// Helper Guards (pure TS; no runtime deps)
export const isTuple4 = <T>(arr: T[]): arr is Tuple4<T> => arr.length === 4;

export const hasFourCategories = (categories: Category[]): categories is Tuple4<Category> =>
	categories.length === 4 && categories.every((c) => isTuple4(c.words));
