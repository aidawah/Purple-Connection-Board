import type { Puzzle, GroupId } from "$lib/types";

/** Deterministic shuffle using a seed (LCG). */
export function shuffled<T>(arr: T[], seed = Date.now()): T[] {
  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Returns a readable name for a group.
 * Compatible calls:
 *   - groupName("A")
 *   - groupName(puzzle, "A")
 * Prefers puzzle.categories[gid] if available; falls back to "Group A/B/C/D".
 */
export function groupName(puzOrGid: Puzzle | GroupId, maybeGid?: GroupId): string {
  const gid = (typeof puzOrGid === "string" ? puzOrGid : maybeGid) as GroupId | undefined;
  if (!gid) return "Unknown";

  const p = (typeof puzOrGid === "string" ? undefined : (puzOrGid as any));

  // If categories are present, use them (support {title} or {name})
  if (p?.categories && Array.isArray(p.categories)) {
    const idx = gid.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
    const cat = p.categories[idx];
    const label = (cat?.title ?? cat?.name ?? "").trim();
    if (label) return label;
  }

  // Fallback generic labels
  return gid === "A" ? "Group A"
       : gid === "B" ? "Group B"
       : gid === "C" ? "Group C"
       :               "Group D";
}

/** Check if the 4 selected ids are exactly one group of four. */
export function isGroupCorrect(
  puzzle: Puzzle,
  selection: string[]
): { ok: boolean; groupId?: GroupId } {
  if (selection.length !== 4) return { ok: false };
  const ids = new Set(selection);
  const groups = new Set<GroupId>();
  for (const w of puzzle.words) {
    if (ids.has(w.id)) groups.add(w.groupId);
  }
  if (groups.size !== 1) return { ok: false };
  const [gid] = [...groups];
  const expectedIds = puzzle.words.filter(w => w.groupId === gid).map(w => w.id);
  const ok = expectedIds.every(id => ids.has(id));
  return ok ? { ok: true, groupId: gid } : { ok: false };
}


