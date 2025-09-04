<script lang="ts">
  import { createEventDispatcher, tick } from "svelte";
  import type { Puzzle } from "$lib/types";
  import { isGroupCorrect, groupName, shuffled } from "$lib/gameLogic";
  import PuzzleCard from "$lib/components/PuzzleCard.svelte";
  import CompletionRing from "$lib/effects/CompletionRing.svelte";

  /* ---------- props ---------- */
  export let puzzle: Puzzle;
  export let seed: number = 42;                   // deterministic shuffle seed
  export let ringImage = "/images/HealthSpaces_Icon6_circle.png";
  export let ringAutoHideMs = 25000;              // effect duration
  export let showToolbar = true;                  // show Clear / Shuffle & badges

  /* ---------- state ---------- */
  const dispatch = createEventDispatcher();
  let order: string[] = shuffled(puzzle.words.map(w => w.id), seed);
  let selection: string[] = [];
  let solved: Array<"A" | "B" | "C" | "D"> = [];
  let shaking = false;
  let showRing = false;

  /* ---------- helpers ---------- */
  function isLocked(wid: string) {
    const gid = puzzle.words.find(w => w.id === wid)?.groupId;
    return !!gid && solved.includes(gid);
  }
  function labelFor(wid: string) {
    const gid = puzzle.words.find(w => w.id === wid)?.groupId;
    return gid ? groupName(puzzle, gid) : "";
  }

  /* ---------- interactions ---------- */
  export function clear(all = false) {
    if (all) solved = [];
    selection = [];
    dispatch("change", { selection, solved, order });
  }

  export function shuffle() {
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
    dispatch("change", { selection, solved, order });
  }

  export function reset(newSeed = 42) {
    seed = newSeed;
    order = shuffled(puzzle.words.map(w => w.id), seed);
    selection = [];
    solved = [];
    showRing = false;
    dispatch("change", { selection, solved, order });
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
    const res = isGroupCorrect(puzzle, selection);
    if (res.ok && res.groupId && !solved.includes(res.groupId)) {
      solved = [...solved, res.groupId];
      dispatch("groupSolved", { groupId: res.groupId, solved });
      selection = [];

      if (solved.length === 4) {
        // replayable effect
        showRing = false;
        await tick();
        showRing = true;
        dispatch("complete", { solved: [...solved], order: [...order] });
      }
    } else {
      shaking = true; setTimeout(() => (shaking = false), 350);
      selection = [];
    }
    dispatch("change", { selection, solved, order });
  }
</script>

<div class="page">
  {#if showToolbar}
    <div class="toolbar">
      <h1 style="margin:0;font-size:20px;font-weight:700">{puzzle.title}</h1>
      <div style="flex:1"></div>

      <button class="btn btn-primary"
              on:click={() => clear()}
              title="Clear selection (Shift-click to also clear solved groups)"
              on:click|once
      >Clear</button>

      <button class="btn btn-ghost" on:click={shuffle} title="Shuffle unsolved cards">
        Shuffle
      </button>

      {#each solved as gid}
        <span class="badge"><span class="badge-dot"></span>{groupName(puzzle, gid)}</span>
      {/each}
    </div>
  {/if}

  <div class="board-wrap" style="position:relative;width:fit-content;margin-inline:auto;">
    <CompletionRing
      visible={showRing}
      spotImage={ringImage}
      autoHideMs={ringAutoHideMs}
      pad={36}
    />
    <div class="board" class:is-shaking={shaking}>
      {#each order as wid (wid)}
        {@const w = puzzle.words.find(x => x.id === wid)!}
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

<style>
  /* nothing new; uses your global .page, .toolbar, .board styles */
</style>
