import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getPuzzleById } from '$lib/data/puzzles';

export const load: PageLoad = ({ params }) => {
  const id = Number(params.puzzleId);       // e.g. "/gameboard/5" -> 5
  const puzzle = getPuzzleById(id);
  if (!puzzle) throw error(404, 'Puzzle not found');
  return { puzzle };
};




