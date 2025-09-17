// src/lib/useRunPersistence.ts
import { loadRun, saveRun, type RunSnapshot } from "$lib/persistence";

export type RunState = {
  title?: string;
  author?: string;
  moves: number;
  completed: boolean;
  selectedIds: string[];   // 0–4 current selection
  foundIds: string[][];    // each solved set of 4 ids, in solve order
  seed?: number;           // optional; persists shuffle seed if you use it
};

type InitOpts = {
  puzzleId: string;
  // return the current state we should persist
  getState: () => RunState;
  // apply loaded state into your board
  applyState: (s: Partial<RunState>) => void;
};

export function initRunPersistence({ puzzleId, getState, applyState }: InitOpts) {
  let saveTimer: any = null;

  function persistNow() {
    const s = getState();
    const payload: RunSnapshot = {
      ts: Date.now(),
      run: {
        title: s.title ?? "",
        author: s.author ?? "",
        moves: s.moves ?? 0,
        completed: !!s.completed,
        selectedIds: [...(s.selectedIds ?? [])],
        foundIds: [...(s.foundIds ?? [])],
        seed: typeof s.seed === "number" ? s.seed : undefined
      }
    };
    void saveRun(puzzleId, payload);
  }

  function persistDebounced(delay = 250) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, delay);
  }

  async function load() {
    const snap = await loadRun(puzzleId);
    if (snap?.run) {
      applyState({
        title: snap.run.title ?? "",
        author: snap.run.author ?? "",
        moves: typeof snap.run.moves === "number" ? snap.run.moves : 0,
        completed: !!snap.run.completed,
        selectedIds: Array.isArray(snap.run.selectedIds) ? snap.run.selectedIds : [],
        foundIds: Array.isArray(snap.run.foundIds) ? snap.run.foundIds : [],
        seed: typeof snap.run.seed === "number" ? snap.run.seed : undefined
      });
    }
  }

  return {
    load,
    persistNow,
    persistDebounced
  };
}
