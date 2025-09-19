// src/routes/gameboard/[puzzleId]/+page.ts
export const ssr = false; // ensure Firebase client SDK is safe to use here

import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchPuzzle, db } from '$lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type GID = 'A' | 'B' | 'C' | 'D';
type EngineWord = { id: string; text: string; groupId: GID };
type EnginePuzzle = {
  id?: string | number;
  title: string;
  words: EngineWord[];
  categories: Array<{ title: string; words: string[] }>;
  description?: string;
};

// Demo fallback (unchanged)
const DEMO: EnginePuzzle = {
  id: 'example',
  title: 'Example Demo: Learn the Connections',
  words: [
    { id: 'A1', text: 'Pancakes', groupId: 'A' },
    { id: 'A2', text: 'Omelet',   groupId: 'A' },
    { id: 'A3', text: 'Bagel',    groupId: 'A' },
    { id: 'A4', text: 'Yogurt',   groupId: 'A' },
    { id: 'B1', text: 'Sky',      groupId: 'B' },
    { id: 'B2', text: 'Jeans',    groupId: 'B' },
    { id: 'B3', text: 'Sapphire', groupId: 'B' },
    { id: 'B4', text: 'Ocean',    groupId: 'B' },
    { id: 'C1', text: 'Beagle',   groupId: 'C' },
    { id: 'C2', text: 'Poodle',   groupId: 'C' },
    { id: 'C3', text: 'Bulldog',  groupId: 'C' },
    { id: 'C4', text: 'Husky',    groupId: 'C' },
    { id: 'D1', text: 'CPU',      groupId: 'D' },
    { id: 'D2', text: 'Mouse',    groupId: 'D' },
    { id: 'D3', text: 'Keyboard', groupId: 'D' },
    { id: 'D4', text: 'Monitor',  groupId: 'D' }
  ],
  categories: [
    { title: 'Breakfast Foods', words: ['Pancakes','Omelet','Bagel','Yogurt'] },
    { title: 'Blue Things',     words: ['Sky','Jeans','Sapphire','Ocean'] },
    { title: 'Dog Breeds',      words: ['Beagle','Poodle','Bulldog','Husky'] },
    { title: 'Computer Parts',  words: ['CPU','Mouse','Keyboard','Monitor'] }
  ]
};

// --- helpers to normalize data coming from Firestore ---
function toArrayLike<T = unknown>(v: any): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'object') return Object.values(v) as T[];
  return [];
}

function coerceWordList(raw: any): string[] {
  const arr = toArrayLike<any>(raw);
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item === 'string') out.push(item);
    else if (item && typeof item === 'object') {
      const cand = item.text ?? item.word ?? item.value ?? '';
      if (typeof cand === 'string' && cand) out.push(cand);
    }
  }
  return out;
}

function coerceCategories(raw: any): Array<{ title: string; words: string[] }> {
  const cats = toArrayLike<any>(raw);
  const res: Array<{ title: string; words: string[] }> = [];
  for (const c of cats) {
    if (!c || typeof c !== 'object') continue;
    const title = String(c.title ?? c.name ?? '').trim();
    const words = coerceWordList(c.words);
    if (title && words.length) res.push({ title, words });
  }
  return res;
}

function coerceWords(raw: any): EngineWord[] {
  const arr = toArrayLike<any>(raw);
  const out: EngineWord[] = [];
  for (let i = 0; i < arr.length; i++) {
    const w = arr[i];
    const id = String(w?.id ?? w?.key ?? i);
    const text = String(w?.text ?? w?.word ?? '').trim();
    const groupId = (w?.groupId ?? ['A','B','C','D'][i % 4]) as GID;
    out.push({ id, text, groupId });
  }
  return out;
}

async function supplementCategoriesIfMissing(id: string, base: any) {
  const already = coerceCategories(base?.categories);
  if (already.length) return already;

  // Try to fetch from Firestore directly
  try {
    const ref = doc(db, 'puzzles', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as any;
    return coerceCategories(data?.categories);
  } catch {
    return [];
  }
}

export const load: PageLoad = async ({ params }) => {
  const id = params.puzzleId;
  if (!id) throw error(400, 'Missing puzzleId');

	if (id === 'example') {
		return { id, puzzle: DEMO };
	}

  const raw = await fetchPuzzle(id); // your existing util
  if (!raw) throw error(404, 'Puzzle not found');

  const words = coerceWords(raw?.words);
  const categories = (await supplementCategoriesIfMissing(id, raw)) ?? [];

  const puzzle: EnginePuzzle = {
    id,
    title: String(raw?.title ?? 'Untitled'),
    words,
    categories,
    description: typeof raw?.description === 'string' ? raw.description : undefined
  };

  // Guard: if no words, this is unusable
  if (!puzzle.words?.length) throw error(404, 'Puzzle not found');

	return { id, puzzle };
};
