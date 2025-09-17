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
  onSnapshot,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
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
import type { PuzzleDoc, UserDoc, ActivityDoc } from "$lib/types";

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
  measurementId: "G-Z6BY1B8RE6",
};
if (!firebaseConfig.apiKey) throw new Error("Missing PUBLIC_FIREBASE_API_KEY");

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const PROJECT_ID = firebaseConfig.projectId;

export function currentUser(): User | null {
  try { return auth.currentUser; } catch { return null; }
}
export type { User };

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

export function signInWithApple() { return signInWithPopup(auth, appleProvider); }
export function signOut() { return firebaseSignOut(auth); }
export function onUserChanged(cb: (u: User | null) => void) { return onAuthStateChanged(auth, cb); }
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
  } catch { return rawUrl; }
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
/* Data helpers                                                        */
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
  if (!snap.exists()) return null;

  const x: any = snap.data();
  const groups = ["A", "B", "C", "D"] as const;
  const words: { id: string; text: string; groupId: "A" | "B" | "C" | "D" }[] = [];

  if (Array.isArray(x?.categories) && x.categories.length) {
    x.categories.slice(0, 4).forEach((cat: any, gi: number) => {
      const gid = groups[gi]!;
      (cat?.words ?? []).slice(0, 4).forEach((w: any, wi: number) => {
        words.push({ id: `${gid}${wi + 1}`, text: String(w ?? ""), groupId: gid });
      });
    });
  }
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

export type FeedPuzzle = {
  id: string;
  title: string;
  publishedAt: any;                 // Firestore Timestamp or ISO string
  summary?: string;
  coverImageUrl?: string;
  author?: { name?: string; uid?: string; email?: string; photoURL?: string };
};

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
 */
export async function fetchPublishedPuzzlesPage(
  pageSize = 5,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ items: FeedPuzzle[]; lastDoc?: QueryDocumentSnapshot<DocumentData>; hasMore: boolean; }> {
  try {
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
    // Fallback if composite index is missing or publishedAt not set on some docs:
    try {
      const qRef = query(collection(db, "puzzles"), orderBy("publishedAt", "desc"), limit(pageSize * 3));
      const snap = await getDocs(qRef);
      const filtered = snap.docs
        .map(mapFeedPuzzle)
        .filter((p) => (p as any)?.isPublished ?? true) // many docs will still have isPublished set
        .slice(0, pageSize);
      return { items: filtered, lastDoc: undefined, hasMore: false };
    } catch {
      // Last-resort: simple read, client-side sort
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
