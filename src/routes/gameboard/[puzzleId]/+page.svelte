<script lang="ts">
  export const ssr = false;

  import { page } from "$app/stores";
  import { onMount, tick } from "svelte";
  import { MOCK_PUZZLES } from "$lib/dev/puzzles";
  import type { Puzzle } from "$lib/types";
  import { isGroupCorrect, groupName, shuffled } from "$lib/gameLogic";
  import PuzzleCard from "$lib/components/PuzzleCard.svelte";
  import CompletionRing from "$lib/effects/CompletionRing.svelte";

  let puzzle: Puzzle | null = null;
  let loading = true;
  let err: string | null = null;

  // UI state
  let order: string[] = [];                 // shuffled word IDs
  let selection: string[] = [];             // currently selected word IDs
  let solved: Array<"A"|"B"|"C"|"D"> = [];  // found group IDs
  let shaking = false;

  // victory effect toggle
  let showRing = false;

  onMount(() => {
    const pid = $page.params.puzzleId;
    const p = MOCK_PUZZLES.find(p => p.id === pid) ?? null;
    if (!p) {
      err = "Puzzle not found in mock data. Try /gameboard/demo-1 or /gameboard/demo-2.";
      loading = false;
      return;
    }
    puzzle = p;
    order = shuffled(puzzle.words.map(w => w.id), 42); // deterministic shuffle
    loading = false;
  });

  function isLocked(wid: string) {
    if (!puzzle) return false;
    const gid = puzzle.words.find(w => w.id === wid)?.groupId;
    return !!gid && solved.includes(gid!);
  }

  function labelFor(wid: string) {
    if (!puzzle) return "";
    const gid = puzzle.words.find(w => w.id === wid)?.groupId;
    return gid ? groupName(puzzle, gid) : "";
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

  async function commitSelection() {
    if (!puzzle) return;
    const res = isGroupCorrect(puzzle, selection);
    if (res.ok && res.groupId && !solved.includes(res.groupId)) {
      solved = [...solved, res.groupId];
      selection = [];

      // when all 4 groups are done, fire the completion ring
      if (solved.length === 4) {
  // replay the completion ring
  showRing = false;
  await tick();
  showRing = true;

  // NEW: persist completion to localStorage for the Browse "Completed" tab
  try {
    const raw = localStorage.getItem("completed");
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(puzzle!.id);
    localStorage.setItem("completed", JSON.stringify([...set]));
  } catch (e) {
    console.error("Failed to persist completion", e);
  }
}

    } else {
      shaking = true; setTimeout(() => (shaking = false), 350);
      selection = [];
    }
  }

  // Clear selection (Shift/Ctrl/Meta click also clears solved groups)
  function clearSelection(e?: MouseEvent) {
    if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      solved = [];
    }
    selection = [];
  }

  // Shuffle only the UNSOLVED cards; keep solved in place
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
  <p class="page" style="opacity:.7">Loading…</p>
{:else if err}
  <pre class="page" style="color:#ff6b6b">{err}</pre>
{:else}
  <div class="page">
    <div class="toolbar">
      <h1 style="margin:0;font-size:20px;font-weight:700">{puzzle!.title}</h1>
      <div style="flex:1"></div>

      <button class="btn btn-primary"
              on:click={(e) => clearSelection(e)}
              title="Clear selection (Shift-click to also clear solved groups)"
              disabled={selection.length === 0 && solved.length === 0}>
        Clear
      </button>

      <button class="btn btn-ghost"
              on:click={shuffleUnsolved}
              title="Shuffle unsolved cards">
        Shuffle
      </button>

      {#each solved as gid}
        <span class="badge"><span class="badge-dot"></span>{groupName(puzzle!, gid)}</span>
      {/each}
    </div>

    <!-- Wrap the grid so the effect can absolutely-position over it -->
    <div class="board-wrap" style="position:relative;width:fit-content;margin-inline:auto;">
      <!-- Completion effect (uses static image at /images/*) -->
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

      <div class="board" class:is-shaking={shaking}>
        {#each order as wid (wid)}
          {@const w = puzzle!.words.find(x => x.id === wid)!}
          <PuzzleCard
            text={w.text}
            wordId={w.id}
            selected={selection.includes(w.id)}
            locked={isLocked(w.id)}
            label={labelFor(w.id)}
            on:toggle={(e) => toggle(e.detail.wordId)}
          />
        {/each}
      </div>
    </div>
  </div>
{/if}

