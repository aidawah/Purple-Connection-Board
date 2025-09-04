import type { GroupId, Puzzle } from "$lib/types";

export function isGroupCorrect(puzzle: Puzzle, ids: string[]) {
  if (ids.length !== 4) return { ok: false as const };
  const groupIds = ids
    .map(id => puzzle.words.find(w => w.id === id)?.groupId)
    .filter(Boolean) as GroupId[];
  const allSame = groupIds.every(g => g === groupIds[0]);
  return allSame ? { ok: true as const, groupId: groupIds[0] } : { ok: false as const };
}

export const groupName = (p: Puzzle, gid: GroupId) =>
  p.groups.find(g => g.id === gid)?.name ?? "";

// quick shuffle for the grid
export function shuffled<T>(arr: T[], seed = 1): T[] {
  let a = [...arr], s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;          // deterministic-ish
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
