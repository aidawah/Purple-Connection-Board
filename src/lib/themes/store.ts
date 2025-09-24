// src/lib/theme/store.ts
import { writable, get } from "svelte/store";
import { browser } from "$app/environment";
import type { ThemeKey, Theme } from "./themes";
import { THEMES } from "./themes";

const LS_KEY = "connections:themeKey";
const LS_PER_PUZZLE = "connections:themeByPuzzle";

// ----- base (global) theme -----
function loadThemeKey(): ThemeKey {
  if (!browser) return "spring";
  try {
    return (localStorage.getItem(LS_KEY) as ThemeKey) || "spring";
  } catch {
    return "spring";
  }
}
export const themeKey = writable<ThemeKey>(loadThemeKey());
export const theme = writable<Theme>(THEMES[loadThemeKey()]);

themeKey.subscribe((k) => {
  theme.set(THEMES[k] ?? THEMES.spring);
  if (browser) {
    try { localStorage.setItem(LS_KEY, k); } catch {}
  }
});
export function setThemeByKey(k: ThemeKey) {
  themeKey.set(k);
}

// ----- optional per-puzzle theme mapping -----
function loadPuzzleMap(): Record<string, ThemeKey> {
  if (!browser) return {};
  try {
    return JSON.parse(localStorage.getItem(LS_PER_PUZZLE) || "{}") || {};
  } catch {
    return {};
  }
}
const puzzleThemeMap = writable<Record<string, ThemeKey>>(loadPuzzleMap());
puzzleThemeMap.subscribe((m) => {
  if (browser) {
    try { localStorage.setItem(LS_PER_PUZZLE, JSON.stringify(m)); } catch {}
  }
});

export function setPuzzleTheme(puzzleId: string | number, k: ThemeKey) {
  const id = String(puzzleId);
  const m = { ...get(puzzleThemeMap), [id]: k };
  puzzleThemeMap.set(m);
}

export function applyThemeForPuzzle(puzzleId?: string | number) {
  const id = String(puzzleId ?? "");
  const map = get(puzzleThemeMap);
  const k = (id && map[id]) ? map[id] : get(themeKey);
  setThemeByKey(k);
}
