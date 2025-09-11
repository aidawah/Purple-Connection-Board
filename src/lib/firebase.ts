// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";

import { Converters } from "$lib/converters";
import type { PuzzleDoc, UserDoc } from "$lib/types";

/* ------------------------------------------------------------------ */
/* Firebase boot                                                       */
/* ------------------------------------------------------------------ */

const firebaseConfig = {
  apiKey: "AIzaSyAJKLordW0gDiM2QsBypZnT1ffwhzvJpjE",
  authDomain: "purple-connection-board.firebaseapp.com",
  projectId: "purple-connection-board",
  storageBucket: "purple-connection-board.firebasestorage.app",
  messagingSenderId: "926105406557",
  appId: "1:926105406557:web:df201cee495fd4591651b4",
  measurementId: "G-Z6BY1B8RE6"
};

if (!firebaseConfig.apiKey) throw new Error("Missing PUBLIC_FIREBASE_API_KEY");

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const PROJECT_ID = firebaseConfig.projectId;


/* ------------------------------------------------------------------ */
/* Auth helpers                                                        */
/* ------------------------------------------------------------------ */

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

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

export async function fetchPuzzle(id: string) {
  const snap = await getDoc(ref.puzzle(id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as { id: string } & PuzzleDoc) : null;
}

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
/* Browse grid data loader (seed-friendly, resilient)                  */
/* ------------------------------------------------------------------ */

/**
 * Fetches up to `max` puzzles for the Browse page:
 * - Pinned first, then newest.
 * - No illegal `in` filters; works even if `visibility` is missing.
 * - Falls back to unordered fetch if composite index/field is missing.
 * - Normalizes difficulty to "Easy" | "Medium" | "Hard".
 */
export async function fetchBrowsePuzzles(max = 60) {
  const toTitle = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

  const mapDoc = (d: any) => {
    const x = d.data() as any;
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
    // Preferred ordering (may require a composite index if you add a where())
    const qRef = query(col.puzzles(), orderBy("isPinned", "desc"), orderBy("createdAt", "desc"), limit(max));
    const snap = await getDocs(qRef);
    return snap.docs.map(mapDoc);
  } catch (err) {
    console.warn("browse ordered query failed; falling back:", err);
    const snap = await getDocs(col.puzzles());
    return snap.docs.slice(0, max).map(mapDoc);
  }
}
