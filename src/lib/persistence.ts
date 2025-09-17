// src/lib/persistence.ts
import { browser } from "$app/environment";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "$lib/firebase"; // make sure firebase.ts exports { db, auth }
import type { User } from "firebase/auth";

/* =========================
 * Types
 * =======================*/
export type RunSnapshot = {
  run?: {
    title?: string;
    author?: string;
    moves?: number;
    completed?: boolean;
    selectedIds?: string[];   // current selection (0–4)
    foundIds?: string[][];    // solved sets of 4 ids, in solve order
    seed?: number;            // optional shuffle seed
  };
  ts: number;
};

/* =========================
 * LocalStorage helpers
 * =======================*/
function localSaveRun(puzzleId: string, snapshot: RunSnapshot) {
  if (!browser) return;
  try {
    localStorage.setItem(`connections:${puzzleId}`, JSON.stringify(snapshot));
  } catch {}
}
function localLoadRun(puzzleId: string): RunSnapshot | null {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(`connections:${puzzleId}`);
    return raw ? (JSON.parse(raw) as RunSnapshot) : null;
  } catch {
    return null;
  }
}

/* =========================
 * Firestore helpers
 * (arrays cannot contain arrays directly; pack/unpack)
 * =======================*/
function packFoundIds(found?: string[][]): { items: string[] }[] {
  if (!Array.isArray(found)) return [];
  return found.map((set) => ({ items: Array.isArray(set) ? set : [] }));
}
function unpackFoundIds(raw: unknown): string[][] {
  if (!Array.isArray(raw)) return [];
  // allow both legacy [[...],[...]] and packed [{items:[...]}]
  if (Array.isArray(raw[0])) return raw as string[][];
  return (raw as any[]).map((o) => (Array.isArray(o?.items) ? (o.items as string[]) : []));
}

/* =========================
 * Auth (require login)
 * =======================*/
async function ensureUser(): Promise<User | null> {
  // Require a signed-in user; do NOT create anonymous users (per your choice)
  try {
    return auth?.currentUser ?? null;
  } catch {
    return null;
  }
}

/* =========================
 * Paths
 * =======================*/
function userDoc(uid: string) {
  return doc(db, "users", uid);
}
function runDoc(uid: string, puzzleId: string) {
  return doc(db, "users", uid, "runs", puzzleId);
}

/* =========================
 * Runs
 * =======================*/
export async function saveRun(puzzleId: string, snapshot: RunSnapshot) {
  // Always mirror to local first for instant resume
  localSaveRun(puzzleId, snapshot);

  if (!browser) return; // SSR: local only
  const user = await ensureUser();
  if (!user) return; // require login for cloud saves

  // pack nested arrays for Firestore
  const packedRun = {
    ...snapshot.run,
    foundIds: packFoundIds(snapshot.run?.foundIds)
  };

  const payload = {
    run: packedRun,
    ts: snapshot.ts ?? Date.now(),
    title: snapshot.run?.title ?? "",
    author: snapshot.run?.author ?? "",
    completed: !!snapshot.run?.completed,
    updatedAt: new Date()
  };

  const userMeta = {
    lastActive: puzzleId,
    lastActiveUpdatedAt: new Date()
  };

  try {
    await Promise.all([
      setDoc(runDoc(user.uid, puzzleId), payload, { merge: true }),
      setDoc(userDoc(user.uid), userMeta, { merge: true })
    ]);
  } catch (e) {
    console.warn("[persist:saveRun] Firestore write failed:", e);
  }
}

export async function loadRun(puzzleId: string): Promise<RunSnapshot | null> {
  if (!browser) return localLoadRun(puzzleId);

  const user = await ensureUser();
  if (user) {
    try {
      const snap = await getDoc(runDoc(user.uid, puzzleId));
      if (snap.exists()) {
        const data = snap.data() as any;
        const rawRun = data.run ?? {};
        const cloud: RunSnapshot = {
          ts: typeof data.ts === "number" ? data.ts : Date.now(),
          run: {
            title: rawRun?.title ?? data.title ?? "",
            author: rawRun?.author ?? data.author ?? "",
            moves: typeof rawRun?.moves === "number" ? rawRun.moves : 0,
            completed: !!rawRun?.completed,
            selectedIds: Array.isArray(rawRun?.selectedIds) ? (rawRun.selectedIds as string[]) : [],
            foundIds: unpackFoundIds(rawRun?.foundIds),
            seed: typeof rawRun?.seed === "number" ? rawRun.seed : undefined
          }
        };
        // keep local mirror in sync
        localSaveRun(puzzleId, cloud);
        return cloud;
      }
    } catch (e) {
      console.warn("[persist:loadRun] Firestore read failed:", e);
    }
  }

  return localLoadRun(puzzleId);
}

export async function clearRun(puzzleId: string) {
  localSaveRun(puzzleId, { ts: Date.now(), run: { completed: false } });

  if (!browser) return;
  const user = await ensureUser();
  if (!user) return;
  try {
    await setDoc(runDoc(user.uid, puzzleId), { deleted: true, updatedAt: new Date() }, { merge: true });
  } catch (e) {
    console.warn("[persist:clearRun] Firestore write failed:", e);
  }
}

