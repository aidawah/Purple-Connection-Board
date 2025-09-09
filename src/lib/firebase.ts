// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  // connectFirestoreEmulator,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  setDoc,
  getDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import {
  getAuth,
  // connectAuthEmulator,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJKLordW0gDiM2QsBypZnT1ffwhzvJpjE",
  authDomain: "purple-connection-board.firebaseapp.com",
  projectId: "purple-connection-board",
  storageBucket: "purple-connection-board.firebasestorage.app",
  messagingSenderId: "926105406557",
  appId: "1:926105406557:web:df201cee495fd4591651b4",
  measurementId: "G-Z6BY1B8RE6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

if (!firebaseConfig.apiKey) throw new Error('Missing PUBLIC_FIREBASE_API_KEY');

// ─── 3) Firestore ─────────────────────────────────────────────────────────────
export const db = getFirestore(app);

// if (import.meta.env.DEV) {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

// ─── 4) Auth ──────────────────────────────────────────────────────────────────
export const auth = getAuth(app);

// if (import.meta.env.DEV) {
//   connectAuthEmulator(auth, 'http://localhost:9099');
// }

// ─── 5) Providers & helpers ──────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
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

// // ─── 6) Puzzle types & helpers ───────────────────────────────────────────────
// export interface Puzzle {
//   id: string;
//   title: string;
//   author: string;
//   groups: { answers: string[]; description: string }[];
//   createdBy?: string;
// }

// export async function fetchPuzzles(): Promise<Puzzle[]> {
//   const snap = await getDocs(collection(db, 'puzzles'));
//   return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
//     id: d.id,
//     ...(d.data() as Omit<Puzzle, 'id'>)
//   }));
// }

// export async function createPuzzle(p: Omit<Puzzle, 'id'>): Promise<string> {
//   const ref = await addDoc(collection(db, 'puzzles'), {
//     ...p,
//     createdBy: auth.currentUser?.uid || null
//   });
//   return ref.id;
// }

// export async function fetchMyPuzzles(): Promise<Puzzle[]> {
//   const uid = auth.currentUser?.uid;
//   if (!uid) return [];
//   const q = query(collection(db, 'puzzles'), where('createdBy', '==', uid));
//   const snap = await getDocs(q);
//   return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
//     id: d.id,
//     ...(d.data() as Omit<Puzzle, 'id'>)
//   }));
// }
