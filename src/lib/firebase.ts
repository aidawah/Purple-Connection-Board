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
  onSnapshot,       // listen to live updates for a query
  startAfter        // paginate queries
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
import type { PuzzleDoc, UserDoc, ActivityDoc } from "$lib/types";

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

// Project id (handy for debugging)
export const PROJECT_ID = firebaseConfig.projectId;


/* ------------------------------------------------------------------ */
/* Auth helpers                                                        */
/* ------------------------------------------------------------------ */

// Provider for Google sign-in flows.
const googleProvider = new GoogleAuthProvider();

// Provider for Apple sign-in (via OAuth).
const appleProvider = new OAuthProvider("apple.com");

// Sign in the user with Google using a popup window.
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope("openid");
  provider.addScope("profile");
  provider.addScope("email");

  const result = await signInWithPopup(auth, provider);

  try {
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = cred?.accessToken;
    const u = auth.currentUser;

    if (accessToken && u) {
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
    console.warn("Google avatar refresh failed:", e);
  }

  return result;
}

export function signInWithApple() {
  return signInWithPopup(auth, appleProvider);
}
export function signOut() {
  return firebaseSignOut(auth);
}
export function onUserChanged(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}
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


/* ------------------------------------------------------------------ */
/* Typed refs/collections                                              */
/* ------------------------------------------------------------------ */

export const col = {
  puzzles: () => collection(db, "puzzles").withConverter(Converters.puzzles),
  users: () => collection(db, "users").withConverter(Converters.users),
  activity: () => collection(db, "activity").withConverter(Converters.activity),
};

export const ref = {
  puzzle: (id: string) => doc(db, "puzzles", id).withConverter(Converters.puzzles),
  user: (uid: string) => doc(db, "users", uid).withConverter(Converters.users),
  userCollection: (uid: string, cid: string) =>
    doc(db, `users/${uid}/collections/${cid}`).withConverter(Converters.userCollections),
  reaction: (puzzleId: string, uid: string) =>
    doc(db, `puzzles/${puzzleId}/reactions/${uid}`).withConverter(Converters.reactions),
  play: (puzzleId: string, uid: string) =>
    doc(db, `puzzles/${puzzleId}/plays/${uid}`).withConverter(Converters.plays),
};


/* ------------------------------------------------------------------ */
/* App-level query helpers                                             */
/* ------------------------------------------------------------------ */

export async function fetchPublicPuzzles(max = 20) {
  const qRef = query(
    col.puzzles(),
    where("visibility", "==", "public"),
    orderBy("publishedAt", "desc"),
    limit(max),
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string } & PuzzleDoc));
}


// Fetch a single puzzle by its document ID.
// Returns a typed object (including the `id`) if it exists, otherwise `null`.
// src/lib/firebase.ts

// Fetch a single puzzle by its document ID and normalize to the GameBoard engine shape.

export async function fetchPuzzle(id: string) {
  const snap = await getDoc(ref.puzzle(id));
  if (!snap.exists()) return null;

  const x: any = snap.data();
  const groups = ["A", "B", "C", "D"] as const;
  const words: { id: string; text: string; groupId: "A" | "B" | "C" | "D" }[] = [];

  // Preferred: build from categories[0..3].words[0..3]
  if (Array.isArray(x?.categories) && x.categories.length) {
    x.categories.slice(0, 4).forEach((cat: any, gi: number) => {
      const gid = groups[gi]!;
      (cat?.words ?? []).slice(0, 4).forEach((w: any, wi: number) => {
        words.push({ id: `${gid}${wi + 1}`, text: String(w ?? ""), groupId: gid });
      });
    });
  }

  // Fallback: use wordsFlat (assumes 16 items, 4 per group)
  if (!words.length && Array.isArray(x?.wordsFlat) && x.wordsFlat.length >= 16) {
    for (let i = 0; i < 16; i++) {
      const gid = groups[Math.floor(i / 4)]!;
      words.push({ id: `${gid}${(i % 4) + 1}`, text: String(x.wordsFlat[i] ?? ""), groupId: gid });
    }
  }

  return {
    id: snap.id,
    title: x?.title ?? "Untitled",
    description: x?.description ?? "",
    words,
  };
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
  await setDoc(
    ref.user(u.uid),
    { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

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
    { merge: true },
  );
}

export async function setLike(puzzleId: string, uid: string, like: boolean) {
  if (like) {
    await setDoc(ref.reaction(puzzleId, uid), { type: "like", createdAt: serverTimestamp() });
  } else {
    await deleteDoc(ref.reaction(puzzleId, uid));
  }
}


/* ------------------------------------------------------------------ */
/* Browse grid data loader                                             */
/* ------------------------------------------------------------------ */

export async function fetchBrowsePuzzles(max = 60) {
  const toTitle = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

  const mapDoc = (d: any) => {
    const x: any = d.data() || {};
    return {
      id: d.id,
      title: x.title ?? "Untitled",
      description: x.description ?? "",
      // if you only store categories[], derive a label from the first one:
      category: x.category ?? x.categories?.[0]?.title ?? "General",
      difficulty: toTitle((x.difficulty ?? "medium").toString()),
      solveCount: x.solveCount ?? 0,
      // <-- use author.* which you write on publish
      createdBy: x.author?.name ?? x.author?.email ?? "Anonymous",
      imageUrl: x.imageUrl ?? "",
      isPinned: !!x.isPinned,
      // prefer publishedAt for display/ordering
      createdAt:
        x.publishedAt?.toDate?.()?.toISOString?.() ??
        x.createdAt?.toDate?.()?.toISOString?.() ??
        new Date().toISOString(),
    };
  };

  // Only published puzzles, newest first.
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
    // If the index for (isPublished==true, publishedAt desc) isn't created yet,
    // fall back to createdAt, then to filter-only.
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
      const qRef = query(col.puzzles(), where("isPublished", "==", true), limit(max));
      const snap = await getDocs(qRef);
      return snap.docs.map(mapDoc);
    }
  }
}


// One-time fetch with pagination support
export async function fetchActivityPage(max = 20, cursor?: any) {
  let qRef = query(col.activity(), orderBy("createdAt", "desc"), limit(max));
  if (cursor) qRef = query(col.activity(), orderBy("createdAt", "desc"), startAfter(cursor), limit(max));
  const snap = await getDocs(qRef);
  return {
    docs: snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string } & ActivityDoc)),
    last: snap.docs[snap.docs.length - 1],
  };
}
