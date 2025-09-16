// src/routes/gameboard/[puzzleId]/+page.ts
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchPuzzle } from '$lib/firebase';

type GID = 'A' | 'B' | 'C' | 'D';
type EngineWord = { id: string; text: string; groupId: GID };
type EnginePuzzle = {
  id?: string | number;
  title: string;
  words: EngineWord[];
  categories: Array<{ title: string; words: string[] }>;
};

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

export const load: PageLoad = async ({ params }) => {
  const id = params.puzzleId; // folder must be [puzzleId]
  if (!id) throw error(400, 'Missing puzzleId');

  if (id === 'example') {
    return { id, puzzle: DEMO };
  }

  const puzzle = await fetchPuzzle(id);
  if (!puzzle) throw error(404, 'Puzzle not found');

  return { id, puzzle };
};
