<script lang="ts">
  import type { Puzzle as DataPuzzle } from "$lib/data/puzzles";
  import { onMount, tick, createEventDispatcher } from "svelte";
  import type { Puzzle } from "$lib/types";
  import { groupName, shuffled } from "$lib/gameLogic";
  import PuzzleCard from "$lib/components/PuzzleCard.svelte";
  import CompletionRing from "$lib/effects/CompletionRing.svelte";

  // ── Props ────────────────────────────────────────────────────────────────────
  export let puzzleId: string | number | null = null;
  export let puzzle: Puzzle | null = null;
  export let initialSeed: number = 42;

  // ── Events ──────────────────────────────────────────────────────────────────
  const dispatch = createEventDispatcher<{
    complete: void;
    wrong: void;
    shuffle: void;
    clear: { clearedSolved: boolean };
    loaded: { puzzleId: string | number; title: string };
    error: { message: string };
    solve: { groupId: "A" | "B" | "C" | "D"; name: string };
  }>();

  // ── Local state ─────────────────────────────────────────────────────────────
  let loading = true;
  let err: string | null = null;

  let order: string[] = [];
  let selection: string[] = [];
  let solved: Array<"A" | "B" | "C" | "D"> = [];
  let shaking = false;
  let showRing = false;
  let toolbarEl: HTMLDivElement | null = null;
  let cellPx = 120;

  // Derived data for slot + fallback rendering
  type Cell = { id: string; text: string; selected: boolean; locked: boolean; label: string };
  let cells: Cell[] = [];

  // ── Slot presence detection (Svelte internal) ───────────────────────────────
  // These reflect whether the parent provided those slots.
  // TS doesn't know about $$slots, so we suppress typing here.
  // @ts-ignore
  const hasGridSlot: boolean = !!($$slots?.grid);
  // @ts-ignore
  const hasToolbarSlot: boolean = !!($$slots?.toolbar);

  function isEngineShape(p: any): boolean {
    return Array.isArray(p?.words) && !!p.words[0]?.id && !!p.words[0]?.text && !!p.words[0]?.groupId;
  }

  // If a real-data puzzle is passed, adapt it once to the engine shape
  $: if (puzzle && !isEngineShape(puzzle)) {
    puzzle = adaptFromDataStore(puzzle as unknown as DataPuzzle);
    console.log("[GameBoard] adapted puzzle to engine shape. words[0]=", puzzle?.words?.[0]);
  }

  function adaptFromDataStore(real: DataPuzzle): Puzzle {
    const letters = ["A", "B", "C", "D"] as const;
    const groups = Array.isArray(real?.solution?.groups) ? real.solution.groups.slice(0, 4) : [];

    const words: { id: string; text: string; groupId: "A" | "B" | "C" | "D" }[] = [];
    const groupsMeta: { id: "A" | "B" | "C" | "D"; name: string }[] = [];

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const G = letters[gi];
      groupsMeta.push({ id: G, name: g?.name ?? `Group ${G}` });
      const wlist = Array.isArray(g?.words) ? g.words : [];
      for (let wi = 0; wi < wlist.length; wi++) {
        words.push({ id: `${G}${wi + 1}`, text: String(wlist[wi]), groupId: G });
      }
    }

    return {
      id: real.id as any,
      title: real.title,
      createdAt: real.createdAt as any,
      words,
      groups: groupsMeta as any
    } as unknown as Puzzle;
  }

  function recalcCell() {
    const pad = 24, gap = 14, rows = 4, cols = 4;
    const maxW = window.innerWidth - 2 * pad;
    const tbH = (toolbarEl?.offsetHeight ?? 56);
    const maxH = window.innerHeight - 2 * pad - tbH - 16;
    const cellW = (maxW - gap * (cols - 1)) / cols;
    const cellH = (maxH - gap * (rows - 1)) / rows;
    cellPx = Math.max(64, Math.floor(Math.min(cellW, cellH)));
  }

  // Build the render order when we have a valid engine puzzle
  $: if (puzzle && isEngineShape(puzzle) && order.length === 0) {
    const ids = puzzle.words.map((w: any) => w.id).filter(Boolean);
    if (ids.length === 16) {
      order = shuffled(ids, initialSeed);
      loading = false;
    }
  }

  // Keep 'cells' in sync for the slot/fallback
  $: cells = (puzzle && order.length)
    ? order.map((wid) => {
        const w = puzzle!.words.find((x) => x.id === wid)!;
        return {
          id: w.id,
          text: w.text,
          selected: selection.includes(w.id),
          locked: isLocked(w.id),
          label: labelFor(w.id)
        } as Cell;
      })
    : [];

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  onMount(async () => {
    try {
      if (!puzzle) {
        const pid = puzzleId ?? "";
        console.log("[GameBoard] puzzleId prop =", pid);

        // 1) Try real dataset
        if (pid !== "") {
          try {
            const dm = await import("$lib/data/puzzles");
            const real = (dm as any).getPuzzleById?.(Number(pid));
            if (real) puzzle = adaptFromDataStore(real as DataPuzzle);
          } catch (e) {
            console.warn("Real data import failed, trying mocks next:", e);
          }
        }

        // 2) Fallback to mocks
        if (!puzzle) {
          const mod = await import("$lib/dev/puzzles");
          const MOCK_PUZZLES: Array<Puzzle & { id: string | number }> = mod.MOCK_PUZZLES;
          const found = MOCK_PUZZLES.find((p) => String(p.id) === String(pid)) ?? null;
          if (!found) {
            err = "Puzzle not found.";
            loading = false;
            dispatch("error", { message: err });
            return;
          }
          puzzle = found;
        }
      }

      order = shuffled(puzzle.words.map((w) => w.id), initialSeed);
      loading = false;
      dispatch("loaded", { puzzleId: (puzzle as any).id ?? (puzzleId as any), title: puzzle.title });

      recalcCell();
      const onR = () => recalcCell();
      window.addEventListener("resize", onR);
      return () => window.removeEventListener("resize", onR);
    } catch (e) {
      console.error("Failed loading puzzle:", e);
      err = "Failed to load puzzle data (see console).";
      loading = false;
      dispatch("error", { message: err });
    }
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function isLocked(wid: string) {
    if (!puzzle) return false;
    const gid = puzzle.words.find((w) => w.id === wid)?.groupId;
    return !!gid && solved.includes(gid as any);
  }

  function labelFor(wid: string) {
    if (!puzzle) return "";
    const gid = puzzle.words.find((w) => w.id === wid)?.groupId as "A" | "B" | "C" | "D" | undefined;
    if (!gid) return "";
    const fromMeta = (puzzle as any).groups?.find?.((g: any) => g.id === gid)?.name;
    return fromMeta ?? groupName(puzzle, gid) ?? "";
  }

  async function commitSelection() {
    if (!puzzle) return;
    const picks = selection
      .map((id) => puzzle!.words.find((w) => w.id === id))
      .filter(Boolean) as Array<{ id: string; text: string; groupId: "A" | "B" | "C" | "D" }>;

    const allSameGroup = picks.length === 4 && new Set(picks.map((w) => w.groupId)).size === 1;
    const gid = allSameGroup ? picks[0].groupId : null;

    if (gid && !solved.includes(gid)) {
      solved = [...solved, gid];
      selection = [];

      const name =
        (puzzle as any).groups?.find?.((g: any) => g.id === gid)?.name ?? groupName(puzzle!, gid);
      dispatch("solve", { groupId: gid, name });

      if (solved.length === 4) {
        showRing = false;
        await tick();
        showRing = true;
        dispatch("complete");
      }
    } else {
      shaking = true;
      setTimeout(() => (shaking = false), 350);
      selection = [];
      dispatch("wrong");
    }
  }

  function toggle(wid: string) {
    if (isLocked(wid)) return;
    if (selection.includes(wid)) {
      selection = selection.filter((id) => id !== wid);
    } else if (selection.length < 4) {
      selection = [...selection, wid];
      if (selection.length === 4) commitSelection();
    }
  }

  function clearSelection(e?: MouseEvent) {
    const clearedSolved = !!(e && (e.shiftKey || e.ctrlKey || e.metaKey));
    if (clearedSolved) solved = [];
    selection = [];
    dispatch("clear", { clearedSolved });
  }

  function shuffleUnsolved() {
    if (!puzzle) return;

    const unsolvedIds = puzzle.words.filter((w) => !solved.includes(w.groupId)).map((w) => w.id);

    const positions = order
      .map((id, i) => ({ id, i }))
      .filter((x) => unsolvedIds.includes(x.id))
      .map((x) => x.i);

    const shuffledIds = shuffled(unsolvedIds, Math.floor(Math.random() * 1e9));

    const next = [...order];
    positions.forEach((pos, k) => (next[pos] = shuffledIds[k]));
    order = next;
    selection = [];
    dispatch("shuffle");
  }
</script>

{#if loading}
  <p class="max-w-7xl mx-auto px-6 py-6 opacity-70">Loading…</p>
{:else if err}
  <pre class="max-w-7xl mx-auto px-6 py-6 text-red-400">{err}</pre>
{:else}
  <div class="max-w-7xl mx-auto px-6 py-6 grid grid-rows-[auto_1fr] gap-4 min-h-[100dvh]">

    {#if !hasGridSlot || hasToolbarSlot}
      <!-- If no grid slot, show fallback toolbar.
           If a toolbar slot is provided explicitly, render that (even when grid is slotted). -->
      <div bind:this={toolbarEl}>
        <slot
          name="toolbar"
          {selection}
          {solved}
          {puzzle}
          {groupName}
          {clearSelection}
          {shuffleUnsolved}
        >
<!-- Browse-style toolbar: white in light, #18181B in dark, buttons like "Play Puzzle" -->
<div class="brand-scope sticky top-0 z-10">
  <div class="brand-toolbar rounded-2xl border px-4 py-3 flex items-center gap-3">
    <h1 class="toolbar-title m-0 text-[20px] font-bold">{puzzle?.title ?? "Puzzle"}</h1>
    <div class="flex-1" />

    <!-- Clear = ghost/outline brand -->
    <button
      class="btn-ghost focus:outline-none focus:brand-ring disabled:opacity-50"
      on:click={(e) => clearSelection(e)}
      disabled={selection.length === 0 && solved.length === 0}
      title="Clear selection (Shift-click to also clear solved groups)"
    >Clear</button>

    <!-- Shuffle = primary brand-filled (like 'Play Puzzle') -->
    <button
      class="btn-primary focus:outline-none focus:brand-ring"
      on:click={shuffleUnsolved}
      title="Shuffle unsolved cards"
    >Shuffle</button>

    {#each solved as gid}
      <span class="inline-flex items-center gap-2 rounded-full px-3 h-8 text-sm
                   brand-chip-text brand-chip-bg brand-chip-border">
        <span class="w-2 h-2 rounded-full brand-dot" />
        {groupName(puzzle!, gid)}
      </span>
    {/each}
  </div>
</div>



        </slot>
      </div>
    {:else}
      <!-- Grid slot present and no toolbar slot: hide toolbar entirely -->
      <div bind:this={toolbarEl}></div>
    {/if}

    <div class="relative w-fit mx-auto">
      {#if showRing}
        <CompletionRing
          visible={showRing}
          spotImage="/images/HealthSpaces_Icon6_circle.png"
          pad={36}
          patternScale={2.0}
          slowFactor={0.75}
          sizeMin={12}
          sizeMax={20}
          autoHideMs={2500}
        />
      {/if}

      <!-- Grid slot with fallback -->
<slot name="grid" {cells} {cellPx} {shaking} {toggle}>
  <div
    class="grid"
    class:animate-shake={shaking}
    style={`grid-template-columns: repeat(4, ${cellPx}px); grid-auto-rows: ${cellPx}px; gap:14px;`}
  >
    {#each cells as c (c.id)}
      <PuzzleCard
        text={c.text}
        wordId={c.id}
        selected={c.selected}
        locked={c.locked}
        label={c.label}
        on:toggle={() => toggle(c.id)}
      />
    {/each}
  </div>
</slot>

    </div>
  </div>
{/if}

<style>
  /* shake … (unchanged) */
  @keyframes shake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-4px); }
    40%, 60% { transform: translateX(4px); }
  }
  .animate-shake { animation: shake .35s; }
/* Normalize brand (works with --brand or --color-brand) */
.brand-scope { --pc-brand: var(--brand, var(--color-brand, #14b8a6)); }

/* Keep your existing brand-ring */
.brand-ring {
  box-shadow:
    0 0 0 2px color-mix(in oklab, var(--pc-brand) 40%, transparent),
    var(--tw-shadow, 0 0 #0000);
}

/* NEW toolbar surface: match Browse cards */
/* Light = #FFFFFF, Dark = #18181B, with neutral borders and subtle shadows */
.brand-toolbar {
  background: #ffffff;
  border-color: #e5e7eb;               /* zinc-200 */
  --tw-shadow: 0 1px 2px rgba(0,0,0,.06);
  box-shadow:
    var(--tw-ring-offset-shadow, 0 0 #0000),
    var(--tw-ring-shadow, 0 0 #0000),
    var(--tw-shadow);
}
:global(.dark) .brand-toolbar {
  background: #18181B;                 /* zinc-900 */
  border-color: #27272a;               /* zinc-800 */
  --tw-shadow: 0 1px 2px rgba(0,0,0,.20);
  box-shadow:
    var(--tw-ring-offset-shadow, 0 0 #0000),
    var(--tw-ring-shadow, 0 0 #0000),
    var(--tw-shadow);
}

/* Heading color like Browse card titles */
.toolbar-title { color: #111827; }     /* zinc-900 */
:global(.dark) .toolbar-title { color: #f4f4f5; }  /* zinc-100 */

/* Primary brand-filled button (like "Play Puzzle") */
.btn-primary {
  --btn-py: 0.5rem; --btn-px: 1rem;
  display: inline-flex; align-items: center; justify-content: center;
  padding: var(--btn-py) var(--btn-px);
  border-radius: .5rem;                 /* md */
  font-weight: 600; font-size: .875rem; /* text-sm */
  background: var(--pc-brand);
  color: #ffffff;
  border: 1px solid color-mix(in oklab, var(--pc-brand) 60%, transparent);
  --tw-shadow: 0 1px 2px rgba(0,0,0,.08);
  box-shadow:
    var(--tw-ring-offset-shadow, 0 0 #0000),
    var(--tw-ring-shadow, 0 0 #0000),
    var(--tw-shadow);
  transition: filter .15s ease, transform .15s ease, box-shadow .15s ease;
}
.btn-primary:hover { filter: brightness(.95); }

/* Ghost/outline brand button (like "Clear Filters") */
.btn-ghost {
  --btn-py: 0.5rem; --btn-px: .9rem;
  display: inline-flex; align-items: center; justify-content: center;
  padding: var(--btn-py) var(--btn-px);
  border-radius: .5rem;
  font-weight: 600; font-size: .875rem;
  color: color-mix(in oklab, var(--pc-brand) 90%, #0f766e);
  background: color-mix(in oklab, var(--pc-brand) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--pc-brand) 30%, transparent);
  transition: background-color .15s ease, filter .15s ease;
}
.btn-ghost:hover { background: color-mix(in oklab, var(--pc-brand) 14%, transparent); }

:global(.dark) .btn-ghost {
  color: color-mix(in oklab, var(--pc-brand) 90%, #9ae6e1);
  background: color-mix(in oklab, var(--pc-brand) 18%, transparent);
  border-color: color-mix(in oklab, var(--pc-brand) 35%, transparent);
}
:global(.dark) .btn-ghost:hover { background: color-mix(in oklab, var(--pc-brand) 24%, transparent); }

/* (Optional) you can keep your existing brand-chip-* rules — they already work */

</style>





