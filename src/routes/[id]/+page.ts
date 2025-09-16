// Run on client only; don't prerender this dynamic path.
export const ssr = false;
export const prerender = false;

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const id = params.id;

  // Lazy import Firebase client SDK on the browser
  const fb = await import('$lib/firebase');
  const { db } = fb as any;
  const { doc, getDoc } = await import('firebase/firestore');

  const snap = await getDoc(doc(db, 'puzzles', id));
  const puzzle = snap.exists() ? { id, ...snap.data() } : null;

  return { id, puzzle };
};
