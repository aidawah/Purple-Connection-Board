// src/lib/firebase.ts

// Core Firebase bootstrap for the client SDK.
import { initializeApp } from "firebase/app";

// Firestore (database) APIs we use throughout the app.
// Note: we import both functions and TS helper types.
import {
  getFirestore,              // Create a Firestore instance bound to our app
  collection,                // Get a reference to a collection
  doc,                       // Get a reference to a document
  query,                     // Build a query
  where,                     // Filter (field comparator)
  orderBy,                   // Sort order
  limit,                     // Limit result count
  getDocs,                   // Run a query (many docs)
  getDoc,                    // Read a single doc by ref
  setDoc,                    // Create/update a doc
  deleteDoc,                 // Delete a doc
  serverTimestamp,           // Server-side timestamp sentinel
  onSnapshot,                // Realtime listener for a query/doc
  startAfter,                // Cursor for pagination
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";

// Firebase Authentication: sign-in providers & session handling.
import {
  getAuth,                         // Create an Auth instance bound to our app
  GoogleAuthProvider,              // Google sign-in provider
  OAuthProvider,                   // Generic OAuth provider (used for Apple)
  signInWithPopup,                 // Interactive popup sign-in
  signOut as firebaseSignOut,      // Sign out current user
  onAuthStateChanged,              // Observe sign-in/sign-out changes
  updateProfile,                   // Update Auth user's profile (e.g., photoURL)
  type User,                       // TS type for Auth user object
} from "firebase/auth";

// App-local helpers: Firestore converters & shared data shapes.
import { Converters } from "$lib/converters";
import type { PuzzleDoc, UserDoc, ActivityDoc } from "$lib/types";

/* ------------------------------------------------------------------ */
/* Firebase boot                                                       */
/* ------------------------------------------------------------------ */

// Firebase project credentials (from the Firebase console).
// ⚠️ If you migrate to environment-based config, keep this shape identical.
const firebaseConfig = {
  apiKey: "AIzaSyAJKLordW0gDiM2QsBypZnT1ffwhzvJpjE",
  authDomain: "purple-connection-board.firebaseapp.com",
  projectId: "purple-connection-board",
  storageBucket: "purple-connection-board.firebasestorage.app",
  messagingSenderId: "926105406557",
  appId: "1:926105406557:web:df201cee495fd4591651b4",
  measurementId: "G-Z6BY1B8RE6",
};

// Fail fast during startup if the config is missing a key field.
// This helps catch env/hosting misconfiguration early.
if (!firebaseConfig.apiKey) throw new Error("Missing PUBLIC_FIREBASE_API_KEY");

// Initialize core SDK singletons. These should be created exactly once.
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Handy constant for logging or feature flags by project.
export const PROJECT_ID = firebaseConfig.projectId;

// Convenience: access the current user without importing `auth` everywhere.
// Wrapped in try/catch to be safe during SSR or unusual runtime states.
export function currentUser(): User | null {
  try { return auth.currentUser; } catch { return null; }
}

// Re-export the User type for ergonomic imports across the app.
export type { User };

/* ------------------------------------------------------------------ */
/* Auth helpers                                                        */
/* ------------------------------------------------------------------ */

// Sign-in providers configured for this app.
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

// Google popup sign-in. Also refreshes the profile photo to a consistent size.
// Note: We intentionally create a fresh provider instance here to add scopes
// without mutating the module-level `googleProvider` (pure function style).
export async function signInWithGoogle() {
	const provider = new GoogleAuthProvider();
	provider.addScope('openid');
	provider.addScope('profile');
	provider.addScope('email');

	const result = await signInWithPopup(auth, provider);

  // Optional: normalize the user's Google avatar to a square `sz` size so
  // your UI has consistent image dimensions across devices.
  try {
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = cred?.accessToken;
    const u = auth.currentUser;

    if (accessToken && u) {
      // Fetch profile data via Google OIDC userinfo endpoint.
      const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        const picture: string | undefined = data?.picture;
        if (picture) await updateProfile(u, { photoURL: normalizeGoogleAvatar(picture, 128) });
      }
    }
  } catch (e) {
    // Non-fatal: failing to refresh the avatar should not block sign-in.
    console.warn("Google avatar refresh failed:", e);
  }
  return result;
}

// Apple sign-in via OAuth popup (requires Apple provider setup in Firebase console).
export function signInWithApple() { return signInWithPopup(auth, appleProvider); }

// Sign out the current user.
export function signOut() { return firebaseSignOut(auth); }

// Subscribe to auth state changes (login/logout). Returns an unsubscribe fn.
export function onUserChanged(cb: (u: User | null) => void) { return onAuthStateChanged(auth, cb); }

// Attempt to coerce a Google photo URL into a fixed square size (sz param).
// Safe no-op fallback if parsing fails or the host is not Googleusercontent.
export function normalizeGoogleAvatar(rawUrl: string, size = 128) {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.endsWith("googleusercontent.com")) {
      u.searchParams.set("sz", String(size));         // Prefer query param if supported
      u.pathname = u.pathname.replace(/=s\d+(-c)?$/i, ""); // Strip legacy path sizing hints
      u.hash = "";
      return u.toString();
    }
    return rawUrl;
  } catch { return rawUrl; }
}

/* ------------------------------------------------------------------ */
/* Typed refs/collections                                              */
/* ------------------------------------------------------------------ */

// Strongly-typed collection refs using your app's converters.
// This keeps reads/writes type-safe and centralized.
export const col = {
	puzzles: () => collection(db, 'puzzles').withConverter(Converters.puzzles),
	users: () => collection(db, 'users').withConverter(Converters.users),
	activity: () => collection(db, 'activity').withConverter(Converters.activity)
};

// Strongly-typed document refs (top-level and subcollections).
// Keeping all paths here makes future refactors safer.
export const ref = {
	puzzle: (id: string) => doc(db, 'puzzles', id).withConverter(Converters.puzzles),
	user: (uid: string) => doc(db, 'users', uid).withConverter(Converters.users),
	userCollection: (uid: string, cid: string) =>
		doc(db, `users/${uid}/collections/${cid}`).withConverter(Converters.userCollections),
	reaction: (puzzleId: string, uid: string) =>
		doc(db, `puzzles/${puzzleId}/reactions/${uid}`).withConverter(Converters.reactions),
	play: (puzzleId: string, uid: string) =>
		doc(db, `puzzles/${puzzleId}/plays/${uid}`).withConverter(Converters.plays)
};

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

// Fetch public puzzles for list/grid views. Ordered by newest published first.
// Returns a plain list of typed puzzle card objects.
export async function fetchPublicPuzzles(max = 20) {
	const qRef = query(
		col.puzzles(),
		where('visibility', '==', 'public'),
		orderBy('publishedAt', 'desc'),
		limit(max)
	);
	const snap = await getDocs(qRef);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as { id: string } & PuzzleDoc);
}

// Fetch a single puzzle and adapt its words into the GameBoard engine shape.
// Supports two storage formats: category buckets and a flat words array.
export async function fetchPuzzle(id: string) {
	const snap = await getDoc(ref.puzzle(id));
	if (!snap.exists()) return null;

	const x: any = snap.data();
	const groups = ['A', 'B', 'C', 'D'] as const;
	const words: { id: string; text: string; groupId: 'A' | 'B' | 'C' | 'D' }[] = [];

  // Preferred source: categories[0..3].words[0..3]
  if (Array.isArray(x?.categories) && x.categories.length) {
    x.categories.slice(0, 4).forEach((cat: any, gi: number) => {
      const gid = groups[gi]!;
      (cat?.words ?? []).slice(0, 4).forEach((w: any, wi: number) => {
        words.push({ id: `${gid}${wi + 1}`, text: String(w ?? ""), groupId: gid });
      });
    });
  }
  // Fallback: wordsFlat[0..15] mapped in groups of four.
  if (!words.length && Array.isArray(x?.wordsFlat) && x.wordsFlat.length >= 16) {
    for (let i = 0; i < 16; i++) {
      const gid = groups[Math.floor(i / 4)]!;
      words.push({ id: `${gid}${(i % 4) + 1}`, text: String(x.wordsFlat[i] ?? ""), groupId: gid });
    }
  }

	return {
		id: snap.id,
		title: x?.title ?? 'Untitled',
		description: x?.description ?? '',
		words
	};
}

// Create or update a user document with initial defaults.
// Uses merge write + server timestamps to preserve existing data.
export async function upsertUser(u: User) {
	const payload: UserDoc = {
		displayName: u.displayName ?? 'Anonymous',
		bio: '',
		photoURL: u.photoURL ?? undefined,
		email: u.email ?? undefined,
		providerIds: u.providerData.map((p) => p?.providerId ?? '').filter(Boolean),
		settings: { darkMode: true, emailNotifications: true },
		stats: { puzzlesCreated: 0, puzzlesPlayed: 0, puzzlesCompleted: 0 },
		pinned: []
	};
	await setDoc(
		ref.user(u.uid),
		{ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
		{ merge: true }
	);
}

// Start or resume a "play" record for a given puzzle+user pair.
// This enables progress tracking, timers, and analytics later on.
export async function startPlay(puzzleId: string, uid: string) {
	await setDoc(
		ref.play(puzzleId, uid),
		{
			uid,
			status: 'in_progress',
			guesses: [],
			timeSpentSec: 0,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		},
		{ merge: true }
	);
}

// Toggle a "like" reaction on a puzzle for a given user.
// Stored as a subdocument per (puzzleId, uid) for easy queries.
export async function setLike(puzzleId: string, uid: string, like: boolean) {
	if (like) {
		await setDoc(ref.reaction(puzzleId, uid), { type: 'like', createdAt: serverTimestamp() });
	} else {
		await deleteDoc(ref.reaction(puzzleId, uid));
	}
}

/* ------------------------------------------------------------------ */
/* Browse grid data loader                                             */
/* ------------------------------------------------------------------ */

// Fetch a browse-friendly set of puzzles with sensible fallbacks when
// composite indexes are not yet available in a fresh project.
export async function fetchBrowsePuzzles(max = 60) {
  // Tiny display helper for labels like difficulty.
  const toTitle = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

  // Normalize a puzzle doc into a lightweight card model for the UI.
  const mapDoc = (d: any) => {
    const x: any = d.data() || {};
    return {
      id: d.id,
      title: x.title ?? "Untitled",
      description: x.description ?? "",
      category: x.category ?? x.categories?.[0]?.title ?? "General",
      difficulty: toTitle((x.difficulty ?? "medium").toString()),
      solveCount: x.solveCount ?? 0,
      createdBy: x.author?.name ?? x.author?.email ?? "Anonymous",
      imageUrl: x.imageUrl ?? "",
      isPinned: !!x.isPinned,
      createdAt:
        x.publishedAt?.toDate?.()?.toISOString?.() ??
        x.createdAt?.toDate?.()?.toISOString?.() ??
        new Date().toISOString(),
    };
  };

  // Primary path: published puzzles by newest published date.
  try {
    let qRef = query(
      col.puzzles(),
      where("isPublished", "==", true),
      orderBy("publishedAt", "desc"),
      limit(max)
    );
    let snap = await getDocs(qRef);
    return snap.docs.map(mapDoc);
  } catch {
    // Fallback 1: order by createdAt if publishedAt index is missing.
    try {
      const qRef = query(
        col.puzzles(),
        where("isPublished", "==", true),
        orderBy("createdAt", "desc"),
        limit(max)
      );
      const snap = await getDocs(qRef);
      return snap.docs.map(mapDoc);
    } catch {
      // Fallback 2: no ordering—client can sort if needed.
      const qRef = query(col.puzzles(), where("isPublished", "==", true), limit(max));
      const snap = await getDocs(qRef);
      return snap.docs.map(mapDoc);
    }
  }
}

// Simple paged activity feed: returns documents and a cursor for "load more".
export async function fetchActivityPage(max = 20, cursor?: any) {
  let qRef = query(col.activity(), orderBy("createdAt", "desc"), limit(max));
  if (cursor) qRef = query(col.activity(), orderBy("createdAt", "desc"), startAfter(cursor), limit(max));
  const snap = await getDocs(qRef);
  return {
    docs: snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string } & ActivityDoc)),
    last: snap.docs[snap.docs.length - 1],
  };
}

/* ------------------------------------------------------------------ */
/* 🔹 Published feed (used by home Recent Activity card)               */
/* ------------------------------------------------------------------ */

// Slim card model for the home page "Recent Puzzles" feed.
export type FeedPuzzle = {
  id: string;
  title: string;
  publishedAt: any;                 // Firestore Timestamp or ISO string
  summary?: string;
  coverImageUrl?: string;
  author?: { name?: string; uid?: string; email?: string; photoURL?: string };
};

// Canonical mapping from a Firestore doc to our FeedPuzzle shape.
function mapFeedPuzzle(d: QueryDocumentSnapshot<DocumentData>): FeedPuzzle {
  const x: any = d.data() || {};
  return {
    id: d.id,
    title: x.title ?? "Untitled",
    publishedAt: x.publishedAt ?? x.createdAt ?? null,
    summary: x.summary ?? x.description ?? "",
    coverImageUrl: x.coverImageUrl ?? x.imageUrl ?? "",
    author: x.author ?? undefined,
  };
}

/**
 * Fetch newest published puzzles, paged by `publishedAt desc`.
 * Never throws — falls back to safe queries so the UI won't hang.
 * Returns { items, lastDoc, hasMore } for infinite scrolling UIs.
 */
export async function fetchPublishedPuzzlesPage(
  pageSize = 5,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ items: FeedPuzzle[]; lastDoc?: QueryDocumentSnapshot<DocumentData>; hasMore: boolean; }> {
  try {
    // Primary query: strictly published content by publishedAt desc.
    let qRef = query(
      collection(db, "puzzles"),
      where("isPublished", "==", true),
      orderBy("publishedAt", "desc"),
      limit(pageSize)
    );
    if (cursor) {
      qRef = query(
        collection(db, "puzzles"),
        where("isPublished", "==", true),
        orderBy("publishedAt", "desc"),
        startAfter(cursor),
        limit(pageSize)
      );
    }
    const snap = await getDocs(qRef);
    const items = snap.docs.map(mapFeedPuzzle);
    return {
      items,
      lastDoc: snap.docs[snap.docs.length - 1],
      hasMore: snap.size === pageSize,
    };
  } catch (e) {
    // Fallback 1: query a larger window by publishedAt and filter client-side.
    try {
      const qRef = query(collection(db, "puzzles"), orderBy("publishedAt", "desc"), limit(pageSize * 3));
      const snap = await getDocs(qRef);
      const filtered = snap.docs
        .map(mapFeedPuzzle)
        .filter((p) => (p as any)?.isPublished ?? true) // Some docs still carry isPublished
        .slice(0, pageSize);
      return { items: filtered, lastDoc: undefined, hasMore: false };
    } catch {
      // Fallback 2: final safety net — small unfiltered batch, sort in-memory.
      const qRef = query(collection(db, "puzzles"), limit(pageSize * 5));
      const snap = await getDocs(qRef);
      const all = snap.docs.map(mapFeedPuzzle);
      const sorted = all
        .filter((x: any) => x && ((x as any).isPublished ?? true))
        .sort((a: any, b: any) => {
          const ad = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt ?? 0);
          const bd = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt ?? 0);
          return bd.getTime() - ad.getTime();
        })
        .slice(0, pageSize);
      return { items: sorted, lastDoc: undefined, hasMore: false };
    }
  }
}
