// src/lib/firebase.ts

// initialize the Firebase app instance.
import { initializeApp } from "firebase/app";

// Firestore (database) APIs: tools to read/write and query documents.
import {
  getFirestore,     // create a Firestore instance bound to our app
  collection,       // get a reference to a collection (table-like)
  doc,              // get a reference to a single document
  query,            // build a Firestore query
  where,            // add a filter to a query (field comparisons)
  orderBy,          // add a sort order to a query
  limit,            // limit how many documents to return
  getDocs,          // run a query and get a snapshot of many docs
  getDoc,           // read one document by reference
  setDoc,           // create or update a document
  deleteDoc,        // delete a document
  serverTimestamp,  // special value: “use server time” when writing
} from "firebase/firestore";

// Firebase Auth APIs: sign in/out and observe user state.
import {
  getAuth,                 // create an Auth instance bound to our app
  GoogleAuthProvider,      // provider object for Google sign-in
  OAuthProvider,           // generic OAuth provider (used here for Apple)
  signInWithPopup,         // open a popup to sign a user in
  signOut as firebaseSignOut, // sign the current user out (renamed locally)
  onAuthStateChanged,      // listen for user sign-in/sign-out changes
  updateProfile,           // update fields on the Auth user (e.g., photoURL)
  type User,               // TypeScript type for an Auth user object
} from "firebase/auth";

// --- App-local imports: Firestore converters and shared types for data safety.
import { Converters } from "$lib/converters";
import type { PuzzleDoc, UserDoc } from "$lib/types";

/* ------------------------------------------------------------------ */
/* Firebase boot                                                       */
/* ------------------------------------------------------------------ */

// Firebase project credentials.
const firebaseConfig = {
  apiKey: "AIzaSyAJKLordW0gDiM2QsBypZnT1ffwhzvJpjE",
  authDomain: "purple-connection-board.firebaseapp.com",
  projectId: "purple-connection-board",
  storageBucket: "purple-connection-board.firebasestorage.app",
  messagingSenderId: "926105406557",
  appId: "1:926105406557:web:df201cee495fd4591651b4",
  measurementId: "G-Z6BY1B8RE6"
};

// if the apiKey is missing, fail fast with a clear error.
if (!firebaseConfig.apiKey) throw new Error("Missing PUBLIC_FIREBASE_API_KEY");

// Create the core Firebase app instance using our config.
export const app = initializeApp(firebaseConfig);

// Create a Firestore database instance connected to our app.
export const db = getFirestore(app);

// Create an Auth instance (handles sign-in, sign-out, current user).
export const auth = getAuth(app);

export const PROJECT_ID = firebaseConfig.projectId;


// Provider for Google sign-in flows.
const googleProvider = new GoogleAuthProvider();

// Provider for Apple sign-in (via OAuth).
const appleProvider = new OAuthProvider("apple.com");

// Sign in the user with Google using a popup window.
export async function signInWithGoogle() {
  // Create a provider and request common OpenID scopes for basic profile info.
  const provider = new GoogleAuthProvider();
  provider.addScope("openid");
  provider.addScope("profile");
  provider.addScope("email");

  // Open the Google sign-in popup and wait for the user to complete
  const result = await signInWithPopup(auth, provider);

  // fetch a profile picture and save it.
  try {
    // Extract the OAuth credential (contains an access token).
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = cred?.accessToken;

    // Get the currently signed-in Firebase Auth user.
    const u = auth.currentUser;

    // If we have both an access token and a current user, call Google’s userinfo endpoint.
    if (accessToken && u) {
      const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // If the HTTP call worked, parse the JSON to find the picture URL.
      if (resp.ok) {
        const data = await resp.json();
        const picture: string | undefined = data?.picture;

        // If we got a picture, store it on the Auth profile.
        if (picture) await updateProfile(u, { photoURL: normalizeGoogleAvatar(picture, 128) });
      }
    }
  } catch (e) {
    console.warn("Google avatar refresh failed:", e);
  }

  // Return the sign-in result - user and provider deets.
  return result;
}

// Sign in with Apple using a popup.
// (The Apple flow/consent happens on Apple’s side; Firebase handles the rest.)
export function signInWithApple() {
  return signInWithPopup(auth, appleProvider);
}

// Sign the current user out of Firebase Auth.
export function signOut() {
  return firebaseSignOut(auth);
}

// Register a listener that fires whenever the Auth user changes
// (e.g., app start, sign-in, sign-out). Returns an unsubscribe function.
export function onUserChanged(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// Normalize Google-hosted avatar URLs:
// - Force a specific size via the "sz" query parameter.
// - Strip trailing size hints in the path (e.g., "=s96-c").
// - Remove any hash fragments.
// If parsing fails or the host isn’t Google, return the original URL.
export function normalizeGoogleAvatar(rawUrl: string, size = 128) {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.endsWith("googleusercontent.com")) {
      u.searchParams.set("sz", String(size));
      u.pathname = u.pathname.replace(/=s\d+(-c)?$/i, "");
      u.hash = "";
      return u.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

// strongly-typed collection references.
// The .withConverter ensures reads/writes use our TypeScript-safe shapes.
export const col = {
  puzzles: () => collection(db, "puzzles").withConverter(Converters.puzzles),
  users: () => collection(db, "users").withConverter(Converters.users),
  activity: () => collection(db, "activity").withConverter(Converters.activity),
};


// These help keep path strings consistent across the codebase.
export const ref = {
  // A single puzzle document by ID.
  puzzle: (id: string) => doc(db, "puzzles", id).withConverter(Converters.puzzles),

  // A single user document by Auth UID.
  user: (uid: string) => doc(db, "users", uid).withConverter(Converters.users),

  // A single “collection” document under a specific user (subcollection).
  userCollection: (uid: string, cid: string) =>
    doc(db, `users/${uid}/collections/${cid}`).withConverter(Converters.userCollections),

  // A “reaction” document under a puzzle, keyed by user (e.g., like).
  reaction: (puzzleId: string, uid: string) =>
    doc(db, `puzzles/${puzzleId}/reactions/${uid}`).withConverter(Converters.reactions),

  // A “play” document tracks a user’s progress on a specific puzzle.
  play: (puzzleId: string, uid: string) =>
    doc(db, `puzzles/${puzzleId}/plays/${uid}`).withConverter(Converters.plays),
};


export async function fetchPublicPuzzles(max = 20) {
  const qRef = query(
    col.puzzles(),
    where("visibility", "==", "public"),
    orderBy("publishedAt", "desc"),
    limit(max),
  );

  // Execute the query and map each document snapshot to a typed object with an `id`.
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string } & PuzzleDoc));
}

// Fetch a single puzzle by its document ID.
// Returns a typed object (including the `id`) if it exists, otherwise `null`.
export async function fetchPuzzle(id: string) {
  const snap = await getDoc(ref.puzzle(id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as { id: string } & PuzzleDoc) : null;
}

// Create or update (merge) a user document based on the currently signed-in Auth user.
// Initializes sensible defaults for settings/stats/pinned on first sign-in.
export async function upsertUser(u: User) {
  const payload: UserDoc = {
    displayName: u.displayName ?? "Anonymous",
    bio: "",
    photoURL: u.photoURL ?? undefined,
    email: u.email ?? undefined,
    providerIds: u.providerData.map((p) => p?.providerId ?? "").filter(Boolean),
    settings: { darkMode: true, emailNotifications: true },
    stats: { puzzlesCreated: 0, puzzlesPlayed: 0, puzzlesCompleted: 0 },
    pinned: [],
  };

  // setDoc with { merge: true } means:
  // - create the doc if it doesn’t exist
  // - update only the provided fields if it does exist
  // We also stamp server-generated timestamps for auditing.
  await setDoc(
    ref.user(u.uid),
    { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// Start (or update) a play session for a given puzzle and user.
// This initializes fields like status, guesses, and timers.
export async function startPlay(puzzleId: string, uid: string) {
  await setDoc(
    ref.play(puzzleId, uid),
    {
      uid,
      status: "in_progress",
      guesses: [],
      timeSpentSec: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }, // merge so we don’t blow away any existing progress fields
  );
}

// Set or remove a “like” reaction on a puzzle for a specific user.
// - When like === true: write a reaction document with a createdAt timestamp.
// - When like === false: delete that reaction document.
export async function setLike(puzzleId: string, uid: string, like: boolean) {
  if (like) {
    await setDoc(ref.reaction(puzzleId, uid), { type: "like", createdAt: serverTimestamp() });
  } else {
    await deleteDoc(ref.reaction(puzzleId, uid));
  }
}


/**
 * Fetches up to `max` puzzles for the Browse page:
 * - Pinned first, then newest.
 * - No illegal `in` filters; works even if `visibility` is missing.
 * - Falls back to unordered fetch if composite index/field is missing.
 * - Normalizes difficulty to "Easy" | "Medium" | "Hard".
 */
export async function fetchBrowsePuzzles(max = 60) {
  // Helper to convert "medium" -> "Medium" (capitalized) safely.
  const toTitle = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

  // Map a Firestore document snapshot to a plain object the UI can use.
  const mapDoc = (d: any) => {
    const x = d.data() as any;

    // `createdBy` could be stored as an object or a string; normalize to a displayable string.
    const createdBy =
      typeof x?.createdBy === "object"
        ? x.createdBy.displayName ?? x.createdBy.uid ?? "Unknown"
        : x?.createdBy ?? "Unknown";

    console.log("puzzle data", x)

    return {
      id: d.id,
      title: x.title ?? "Untitled",
      description: x.description ?? "",
      category: x.category ?? "General",
      difficulty: toTitle((x.difficulty ?? "medium").toString()),
      solveCount: x.solveCount ?? 0,
      createdBy,
      imageUrl: x.imageUrl ?? "",
      isPinned: !!x.isPinned,
      createdAt:
        x.createdAt?.toDate?.()?.toISOString?.() ??
        x.publishedAt?.toDate?.()?.toISOString?.() ??
        new Date().toISOString(),
    };
  };

  try {
    // Preferred ordered query:
    // - First sort by isPinned (true first), then by createdAt (newest first).
    // Note: adding more filters may require Firestore composite indexes.
    const qRef = query(col.puzzles(), orderBy("isPinned", "desc"), orderBy("createdAt", "desc"), limit(max));

    // Run the query and map results into UI-friendly objects.
    const snap = await getDocs(qRef);
    return snap.docs.map(mapDoc);
  } catch (err) {
    // If the ordered query fails (e.g., missing index/field), fall back to a simple fetch.
    console.warn("browse ordered query failed; falling back:", err);
    const snap = await getDocs(col.puzzles());
    return snap.docs.slice(0, max).map(mapDoc);
  }
}
