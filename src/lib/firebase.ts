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
  addDoc,
  deleteDoc,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User
} from "firebase/auth";

import { Converters } from "$lib/converters";
import type { PuzzleDoc, UserDoc } from "$lib/types";

// 1) Client Firebase config (public web keys are fine in client apps)
const firebaseConfig = {
  apiKey: "AIzaSyAvPhsd2JLcqgOOnC9VlJeTmfiM-wMmmeA",
  authDomain: "game-39c6f.firebaseapp.com",
  projectId: "game-39c6f",
  storageBucket: "game-39c6f.firebasestorage.app",
  messagingSenderId: "1041504633574",
  appId: "1:1041504633574:web:e40c1095b761a8740e3127",
  measurementId: "G-VNMHDW1MRG"
};

if (!firebaseConfig.apiKey) throw new Error("Missing PUBLIC_FIREBASE_API_KEY");

// 2) App / Firestore / Auth init
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Emulators (optional)
// import { connectFirestoreEmulator } from "firebase/firestore";
// import { connectAuthEmulator } from "firebase/auth";
// if (import.meta.env.DEV) {
//   connectFirestoreEmulator(db, "localhost", 8080);
//   connectAuthEmulator(auth, "http://localhost:9099");
// }

// 3) Auth
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope("openid");
  provider.addScope("profile");
  provider.addScope("email");

  const result = await signInWithPopup(auth, provider);

  // Try to refresh avatar from Google userinfo
  try {
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = cred?.accessToken;
    const u = auth.currentUser;
    if (accessToken && u) {
      const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
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

// 4) Converters
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

// List latest public puzzles
export async function fetchPublicPuzzles(max = 20) {
  const q = query(
    col.puzzles(),
    where("visibility", "==", "public"),
    orderBy("publishedAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string } & PuzzleDoc));
}

// Fetch a single puzzle
export async function fetchPuzzle(id: string) {
  const snap = await getDoc(ref.puzzle(id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as { id: string } & PuzzleDoc) : null;
}

// Ensure a minimal user doc exists (call after sign-in)
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
    // createdAt/updatedAt added below
  };
  await setDoc(ref.user(u.uid), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
}

// Start or update a play for the current user
export async function startPlay(puzzleId: string, uid: string) {
  await setDoc(
    ref.play(puzzleId, uid),
    {
      uid,
      status: "in_progress",
      guesses: [],
      timeSpentSec: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

// Like/unlike a puzzle
export async function setLike(puzzleId: string, uid: string, like: boolean) {
  if (like) {
    await setDoc(ref.reaction(puzzleId, uid), { type: "like", createdAt: serverTimestamp() });
  } else {
    await deleteDoc(ref.reaction(puzzleId, uid));
  }
}

// raw access without helpers:
// const raw = await getDocs(collection(db, "puzzles"));
// raw.docs.map((d: QueryDocumentSnapshot<DocumentData>) => d.data());
