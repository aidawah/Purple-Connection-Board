// src/lib/converters.ts

// FirestoreDataConverters lets us describe how to read/write a type T.
// QueryDocumentSnapshot/SnapshotOptions are used when reading from Firestore.
import type {
	DocumentData,
	FirestoreDataConverter,
	QueryDocumentSnapshot,
	SnapshotOptions,
	WithFieldValue
} from 'firebase/firestore';

// Import the TypeScript shapes for data to check against
// Import types for strict validation
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
} from './types';

// tiny validators
// Small assertion helper: if cond is false, throw an Error with msg - Condition must be true
function assert(cond: boolean, msg: string): asserts cond {
	if (!cond) throw new Error(msg);
}

// Property check for Difficulty and Visibility
const isDifficulty = (x: unknown): x is Difficulty =>
	x === 'easy' || x === 'medium' || x === 'hard';
const isVisibility = (x: unknown): x is Visibility =>
	x === 'public' || x === 'unlisted' || x === 'private';

// Validate Puzzle
function validatePuzzle(p: PuzzleDoc) {
	// gridSize must be an integer between 2 and 10.
	assert(
		Number.isInteger(p.gridSize) && p.gridSize >= 2 && p.gridSize <= 10,
		'gridSize out of range (2..10)'
	);
	// groupSize must be an integer between 2 and 10.
	assert(
		Number.isInteger(p.groupSize) && p.groupSize >= 2 && p.groupSize <= 10,
		'groupSize out of range (2..10)'
	);

	// Must have exactly `gridSize` categories.
	assert(
		Array.isArray(p.categories) && p.categories.length === p.gridSize,
		'categories.length must equal gridSize'
	);
	p.categories.forEach((c, i) => {
		// Categories must have non-empty titles
		assert(
			typeof c.title === 'string' && c.title.trim().length > 0,
			`categories[${i}].title required`
		);

		assert(
			Array.isArray(c.words) && c.words.length === p.groupSize,
			`categories[${i}].words must have ${p.groupSize} items`
		);
	});

	// wordsFlat === gridSize * groupSize total.
	assert(
		Array.isArray(p.wordsFlat) && p.wordsFlat.length === p.gridSize * p.groupSize,
		'wordsFlat length must equal gridSize * groupSize'
	);

	// Difficulty and visibility
	assert(isDifficulty(p.difficulty), 'Invalid difficulty');
	assert(isVisibility(p.visibility), 'Invalid visibility');
}

//  helpers
// returns the snapshot data as T.
const passthroughFrom = <T>(snap: QueryDocumentSnapshot, _?: SnapshotOptions): T =>
	snap.data() as T;

// casts the value to DocumentData.
const passthroughTo = <T>(value: WithFieldValue<T>): DocumentData =>
	value as unknown as DocumentData;

// converters
// Each converter tells Firestore how to read (fromFirestore) and write (toFirestore)
// a specific TypeScript interface. Using these with .withConverter(...) gives
// type safety across the app (reads/writes match our interfaces).

export const userConverter: FirestoreDataConverter<UserDoc> = {
	toFirestore: passthroughTo, // write as-is
	fromFirestore: passthroughFrom // read as-is
};

export const puzzleConverter: FirestoreDataConverter<PuzzleDoc> = {
	// validate puzzle fields during creation
	toFirestore: (value: WithFieldValue<PuzzleDoc>) => {
		const maybe = value as PuzzleDoc;
		if (typeof maybe.gridSize === 'number' && typeof maybe.groupSize === 'number') {
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

// export so other files can import all converters from one place.
export const Converters = {
	users: userConverter,
	puzzles: puzzleConverter,
	plays: playConverter,
	reactions: reactionConverter,
	comments: commentConverter,
	userCollections: userCollectionConverter,
	activity: activityConverter
};
