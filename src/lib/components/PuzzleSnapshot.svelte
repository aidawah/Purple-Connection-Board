<script lang="ts">
  import type { Puzzle } from "$lib/types";
  import { createEventDispatcher } from "svelte";

  export let puzzle: Puzzle;
  export let pinned = false;

  const dispatch = createEventDispatcher();

  function togglePin(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dispatch("pin", { id: puzzle.id, pinned: !pinned });
  }

  function toMillis(x: any): number {
    if (!x) return 0;
    if (typeof x === "number") return x;
    if (x.seconds) return x.seconds * 1000; // Firestore Timestamp
    const t = Date.parse(x);
    return Number.isNaN(t) ? 0 : t;
  }
  const created = new Date(toMillis((puzzle as any).createdAt));
</script>

<a href={`/gameboard/${puzzle.id}`} class="snapshot" style="text-decoration:none;color:inherit">
  <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:10px">
    <div style="min-width:0">
      <h3 style="margin:0;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        {puzzle.title}
      </h3>
      <time style="opacity:.65;font-size:12px">
        {created.toLocaleString()}
      </time>
    </div>
    <button
      aria-label={pinned ? "Unpin" : "Pin"}
      title={pinned ? "Unpin" : "Pin"}
      class="btn btn-ghost"
      on:click={togglePin}
      style="height:30px;padding:0 10px;border-radius:8px"
    >
      {pinned ? "★" : "☆"}
    </button>
  </div>

  <div class="grid">
    {#each puzzle.words as w}
      <div class="chip" title={w.text}>{w.text}</div>
    {/each}
  </div>
</a>

<style>
  /* Uses your theme’s .snapshot look; these ensure the grid is neat */
  .grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
  .chip{
    font-size:12px; border:1px solid #26395e; border-radius:10px; padding:6px 8px;
    text-align:center; color:#cfe1ff; background:#0f1830;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
</style>



