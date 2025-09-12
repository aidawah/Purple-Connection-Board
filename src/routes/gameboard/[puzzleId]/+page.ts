import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchPuzzle } from '$lib/firebase';

export const load: PageLoad = async ({ params }) => {
  const id = params.puzzleId;              // must match [puzzleId] exactly
  if (!id) throw error(400, 'Missing puzzleId');

  const puzzle = await fetchPuzzle(id);    // returns engine-normalized shape
  if (!puzzle) throw error(404, 'Puzzle not found');

  return { id, puzzle };
};







