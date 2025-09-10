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
  updateProfile,
  type User
} from 'firebase/auth';


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyAvPhsd2JLcqgOOnC9VlJeTmfiM-wMmmeA',
  authDomain: 'game-39c6f.firebaseapp.com',
  projectId: 'game-39c6f',
  storageBucket: 'game-39c6f.firebasestorage.app',
  messagingSenderId: '1041504633574',
  appId: '1:1041504633574:web:e40c1095b761a8740e3127',
  measurementId: 'G-VNMHDW1MRG'
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

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');

  const result = await signInWithPopup(auth, provider);

  // Refresh avatar from Google userinfo
  try {
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = cred?.accessToken;
    const u = auth.currentUser;
    if (accessToken && u) {
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        const picture: string | undefined = data?.picture;
        if (picture) {
          await updateProfile(u, { photoURL: normalizeGoogleAvatar(picture, 128) });
        }
      }
    }
  } catch (e) {
    console.warn('Google avatar refresh failed:', e);
  }

  return result;
}
export function signInWithApple() {
  return signInWithPopup(auth, appleProvider);
}
export function signOut() {
  return firebaseSignOut(auth);
}
export function normalizeGoogleAvatar(rawUrl: string, size = 128) {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.endsWith('googleusercontent.com')) {
      u.searchParams.set('sz', String(size));
      u.pathname = u.pathname.replace(/=s\d+(-c)?$/i, '');
      u.hash = '';
      return u.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
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
