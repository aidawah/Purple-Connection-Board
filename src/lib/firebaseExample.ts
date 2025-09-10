// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut as _signOut,
  onAuthStateChanged,
  updateProfile,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';

/** 1) Firebase config (keep inline for now; we can env-ify later) */
const firebaseConfig = {
  apiKey:            'AIzaSyAvPhsd2JLcqgOOnC9VlJeTmfiM-wMmmeA',
  authDomain:        'game-39c6f.firebaseapp.com',
  projectId:         'game-39c6f',
  storageBucket:     'game-39c6f.firebasestorage.app',
  messagingSenderId: '1041504633574',
  appId:             '1:1041504633574:web:e40c1095b761a8740e3127',
  measurementId:     'G-VNMHDW1MRG'
};

/** 2) Initialize */
const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

/** Utility: normalize Google avatars for consistent sizing */
export function normalizeGoogleAvatar(rawUrl: string, size = 128) {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.endsWith('googleusercontent.com')) {
      if (u.searchParams.has('sz')) {
        u.searchParams.set('sz', String(size));
      } else {
        const replaced = u.pathname.replace(/=s\d+(-c)?$/i, `=s${size}-c`);
        u.pathname = replaced === u.pathname ? `${u.pathname}=s${size}-c` : replaced;
      }
      u.hash = '';
      return u.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

/** 3) Auth helpers (unchanged) */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');

  const result = await signInWithPopup(auth, provider);

  // Try to refresh avatar from Google userinfo
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
  return signInWithPopup(auth, new OAuthProvider('apple.com'));
}
export function signOutUser() {
  return _signOut(auth);
}
export function onUserChanged(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

/** Helpers */
function requireUser() {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  return u;
}
async function stampWithUser<T extends object>(data: T) {
  const u = requireUser();
  return {
    ...data,
    uid:        u.uid,
    posterName: u.displayName ?? 'Anonymous',
    posterPic:  u.photoURL ?? null,
    updatedAt:  serverTimestamp(),
    ...(((data as any).createdAt ? {} : { createdAt: serverTimestamp() }) as any)
  };
}

/** 4) Puzzles (same API, cleaner fields) */
export async function savePuzzle(payload: {
  title?: string;
  size: number;
  categories: { name: string; words: string[] }[];
  isPublic?: boolean;
  version?: number;
}): Promise<string> {
  const ref = await addDoc(
    collection(db, 'puzzles'),
    await stampWithUser({
      title: payload.title ?? '',
      size: payload.size,
      categories: payload.categories,
      isPublic: payload.isPublic ?? false,
      version: payload.version ?? 1
    })
  );
  return ref.id;
}

export async function updatePuzzle(
  id: string,
  payload: {
    title?: string;
    size: number;
    categories: { name: string; words: string[] }[];
    isPublic?: boolean;
    version?: number;
  }
): Promise<void> {
  await updateDoc(doc(db, 'puzzles', id), await stampWithUser(payload));
}

export async function deletePuzzle(id: string): Promise<void> {
  await deleteDoc(doc(db, 'puzzles', id));
}

// keep these two for compatibility with your UI buttons
export async function publishPuzzle(id: string): Promise<void> {
  await updateDoc(doc(db, 'puzzles', id), { isPublic: true, updatedAt: serverTimestamp() });
}
export async function unpublishPuzzle(id: string): Promise<void> {
  await updateDoc(doc(db, 'puzzles', id), { isPublic: false, updatedAt: serverTimestamp() });
}

export async function fetchMyPuzzles(): Promise<Array<{ id: string; [key: string]: any }>> {
  const u = requireUser();
  const qy = query(collection(db, 'puzzles'), where('uid', '==', u.uid));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

/** 5) User settings — moved to users/{uid}/settings/default */
export type ThemeChoice = 'system' | 'light' | 'dark';
export type UserSettings = {
  theme: ThemeChoice;
  reduceMotion: boolean;
  compactCards: boolean;
  showAvatars: boolean;
  autoShuffle: boolean;
};
export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  reduceMotion: false,
  compactCards: false,
  showAvatars: true,
  autoShuffle: true
};

export async function getUserSettings(): Promise<UserSettings> {
  const u = requireUser();
  const ref = doc(db, `users/${u.uid}/settings/default`);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<UserSettings>) };
  } else {
    await setDoc(
      ref,
      { ...DEFAULT_SETTINGS, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    );
    return DEFAULT_SETTINGS;
  }
}
export async function updateUserSettings(patch: Partial<UserSettings>): Promise<void> {
  const u = requireUser();
  const ref = doc(db, `users/${u.uid}/settings/default`);
  await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

/** 6) Plays (replaces recentGames)
 * Path: users/{uid}/plays/{playId}
 * If you want "one active play per puzzle", you can use playId === puzzleId.
 */
export type PlayStatus = 'in_progress' | 'completed' | 'abandoned';
export type PlayDoc = {
  puzzleId: string;
  status: PlayStatus;
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any;
  durationMs?: number;
  moves?: number;
  tilesSelected?: string[];
  version?: number;
};

// create or update a play
export async function upsertPlay(playId: string, data: Omit<PlayDoc, 'createdAt'|'updatedAt'>) {
  const u = requireUser();
  const ref = doc(db, `users/${u.uid}/plays/${playId}`);
  const base: PlayDoc = {
    ...data,
    version: data.version ?? 1
  };
  await setDoc(
    ref,
    {
      ...base,
      updatedAt: serverTimestamp(),
      ...(await (async () => {
        const cur = await getDoc(ref);
        return cur.exists() ? {} : { createdAt: serverTimestamp() };
      })())
    },
    { merge: true }
  );
}

// convenience wrappers to mimic your old "recent" API
export interface RecentEntry { uid: string; id: string /* puzzleId */; ts: number }
export async function logRecentGame(puzzleId: string): Promise<void> {
  // compat: treat "recent" as a play heartbeat
  await upsertPlay(puzzleId, { puzzleId, status: 'in_progress' });
}
export async function fetchRecentGames(limitCount = 12): Promise<RecentEntry[]> {
  const u = requireUser();
  const qy = query(
    collection(db, `users/${u.uid}/plays`),
    orderBy('updatedAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    const millis = data.updatedAt?.toMillis?.() ?? Number(data.updatedAt) ?? 0;
    return { uid: u.uid, id: data.puzzleId, ts: millis } as RecentEntry;
  });
}

// mark a play complete
export async function completePlay(playId: string, data: { durationMs?: number; moves?: number }) {
  const u = requireUser();
  const ref = doc(db, `users/${u.uid}/plays/${playId}`);
  await setDoc(
    ref,
    {
      status: 'completed' as PlayStatus,
      ...(data ?? {}),
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}