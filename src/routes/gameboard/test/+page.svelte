<script context="module" lang="ts">
  // IMPORTANT: page options belong in the module script
  export const ssr = false;
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import PuzzleCard from "$lib/components/PuzzleCard.svelte";
  import CompletionRing from "$lib/effects/CompletionRing.svelte";
  import type { Puzzle } from "$lib/types";
  import { isGroupCorrect, groupName, shuffled } from "$lib/gameLogic";

  // Page state
  let puzzle: Puzzle | null = null;
  let loading = true;
  let err: string | null = null;

  let order: string[] = [];                      // 16 ids in grid order
  let selection: string[] = [];                  // up to 4 selected ids
  let solved: Array<"A" | "B" | "C" | "D"> = []; // solved group ids

  let shaking = false;
  let showRing = false;

  let toolbarEl: HTMLDivElement | null = null;
  let cellPx = 120;

  function recalcCell() {
    if (typeof window === "undefined") return;
    const pad = 24, gap = 14, rows = 4, cols = 4;
    const maxW = window.innerWidth - 2 * pad;
    const tbH = (toolbarEl?.offsetHeight ?? 56);
    const maxH = window.innerHeight - 2 * pad - tbH - 16;
    const cellW = (maxW - gap * (cols - 1)) / cols;
    const cellH = (maxH - gap * (rows - 1)) / rows;
    cellPx = Math.max(80, Math.floor(Math.min(cellW, cellH)));
  }

  onMount(async () => {
    try {
      const mod = await import("$lib/dev/puzzles");
      const MOCK_PUZZLES: Array<Puzzle & { id: string | number }> = mod.MOCK_PUZZLES;

      const p = MOCK_PUZZLES.find(x => String(x.id) === "demo-1") ?? MOCK_PUZZLES[0];
      if (!p) {
        err = "No mock puzzles found in $lib/dev/puzzles";
        loading = false;
        return;
      }

      puzzle = p;
      order = shuffled(puzzle.words.map(w => w.id), 42);
      loading = false;

      recalcCell();
      const onR = () => recalcCell();
      window.addEventListener("resize", onR);
      return () => window.removeEventListener("resize", onR);
    } catch (e) {
      console.error(e);
      err = "Failed to load puzzle data (see console).";
      loading = false;
    }
  });

  // Helpers
  function isLocked(wid: string) {
    if (!puzzle) return false;
    const gid = puzzle.words.find(w => w.id === wid)?.groupId;
    return !!gid && solved.includes(gid);
  }
  function labelFor(wid: string) {
    if (!puzzle) return "";
    const gid = puzzle.words.find(w => w.id === wid)?.groupId;
    return gid ? groupName(puzzle, gid) : "";
  }

  async function commitSelection() {
    if (!puzzle) return;
    const res = isGroupCorrect(puzzle, selection);
    if (res.ok && res.groupId && !solved.includes(res.groupId)) {
      solved = [...solved, res.groupId];
      selection = [];

      if (solved.length === 4) {
        showRing = false;
        await tick();
        showRing = true;
      }
    } else {
      shaking = true;
      setTimeout(() => (shaking = false), 350);
      selection = [];
    }
  }

  function toggle(wid: string) {
    if (isLocked(wid)) return;
    if (selection.includes(wid)) {
      selection = selection.filter(id => id !== wid);
    } else if (selection.length < 4) {
      selection = [...selection, wid];
      if (selection.length === 4) commitSelection();
    }
  }

  function clearSelection(e?: MouseEvent) {
    const clearedSolved = !!(e && (e.shiftKey || e.ctrlKey || e.metaKey));
    if (clearedSolved) solved = [];
    selection = [];
  }

  function shuffleUnsolved() {
    if (!puzzle) return;

    const unsolvedIds = puzzle.words
      .filter(w => !solved.includes(w.groupId))
      .map(w => w.id);

    const positions = order
      .map((id, i) => ({ id, i }))
      .filter(x => unsolvedIds.includes(x.id))
      .map(x => x.i);

    const shuffledIds = shuffled(unsolvedIds, Math.floor(Math.random() * 1e9));
    const next = [...order];
    positions.forEach((pos, k) => (next[pos] = shuffledIds[k]));
    order = next;
    selection = [];
  }
</script>

{#if loading}
  <p class="max-w-7xl mx-auto px-6 py-6 opacity-70">Loading…</p>
{:else if err}
  <pre class="max-w-7xl mx-auto px-6 py-6 text-red-400">{err}</pre>
{:else}
  <div class="max-w-7xl mx-auto px-6 py-6 grid grid-rows-[auto_1fr] gap-4 min-h-[100dvh]">
    <div
      bind:this={toolbarEl}
      class="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#1a2a43]
             bg-gradient-to-b from-[rgba(18,26,43,.85)] to-[rgba(18,26,43,.65)] backdrop-blur-md"
    >
      <h1 class="m-0 text-[20px] font-bold">{puzzle?.title ?? "Puzzle"}</h1>
      <div class="flex-1" />
      <button
        class="inline-flex items-center h-9 px-3 rounded-lg font-semibold bg-[#0f3a38] text-[#bff7ee]
               border border-[#14615b] hover:bg-[#12524f] hover:border-[#18837a] disabled:opacity-50"
        on:click={(e) => clearSelection(e)}
        disabled={selection.length === 0 && solved.length === 0}
        title="Clear selection (Shift-click to also clear solved groups)"
      >Clear</button>
      <button
        class="inline-flex items-center h-9 px-3 rounded-lg font-semibold border border-[#304a76]
               text-[#cfe1ff] bg-transparent hover:bg-[#14223d]"
        on:click={shuffleUnsolved}
        title="Shuffle unsolved cards"
      >Shuffle</button>

      {#each solved as gid}
        <span class="inline-flex items-center gap-2 rounded-full px-3 h-8 text-sm
                     text-[#0f766e] bg-[rgba(20,184,166,.16)] border border-[rgba(20,184,166,.35)]">
          <span class="w-2 h-2 rounded-full bg-[#0f766e]" />
          {groupName(puzzle!, gid)}
        </span>
      {/each}
    </div>

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

      <div
        class="grid"
        class:animate-shake={shaking}
        style={`grid-template-columns: repeat(4, ${cellPx}px); grid-auto-rows: ${cellPx}px; gap:14px;`}
      >
        {#each order as wid (wid)}
          {@const w = puzzle!.words.find(x => x.id === wid)!}
          {@const solvedGroup = solved.includes(w.groupId)}
          <!-- Your PuzzleCard flips when locked=true and shows label on the back -->
          <PuzzleCard
            text={w.text}
            wordId={w.id}
            selected={selection.includes(w.id)}
            locked={solvedGroup}
            label={groupName(puzzle!, w.groupId)}
            on:toggle={(e) => toggle(e.detail.wordId)}
          />
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes shake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-4px); }
    40%, 60% { transform: translateX(4px); }
  }
  .animate-shake { animation: shake .35s; }
</style>



