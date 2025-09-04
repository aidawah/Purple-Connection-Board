<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Puzzle } from "$lib/types";
  export let puzzle: Puzzle;
  export let pinned = false;
  const dispatch = createEventDispatcher();

  function togglePin(e: MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    dispatch("pin", { id: puzzle.id, pinned: !pinned });
  }

  function toMillis(x: any) {
    if (!x) return 0; if (typeof x === "number") return x;
    if (x.seconds) return x.seconds * 1000;
    const t = Date.parse(x); return isNaN(t) ? 0 : t;
  }
  const when = toMillis(puzzle.createdAt);
  const whenText = when ? new Date(when).toLocaleString() : "";
</script>

<a
  href={`/gameboard/${puzzle.id}`}
  class="block rounded-2xl border border-[#1a2a43] p-4
         bg-gradient-to-b from-[rgba(13,20,38,.85)] to-[rgba(13,20,38,.65)]
         transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,.35)] hover:border-[#2a4067]
         focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#14b8a6]"
>
  <div class="flex items-start justify-between gap-3">
    <div>
      <h3 class="m-0 text-xl font-semibold">{puzzle.title}</h3>
      {#if whenText}<p class="m-0 text-sm opacity-70">{whenText}</p>{/if}
    </div>

    <button
      on:click={togglePin}
      aria-label={pinned ? "Unpin puzzle" : "Pin puzzle"}
      class="h-9 w-9 grid place-items-center rounded-lg border border-[#2a4067]
             text-[#cfe1ff] bg-transparent hover:bg-[#14223d]
             data-[on=true]:bg-[#14b8a6] data-[on=true]:text-[#053b3a] data-[on=true]:border-[#0ea5a5]"
      data-on={pinned}
    >
      <span class="text-lg">{pinned ? "★" : "☆"}</span>
    </button>
  </div>

  <!-- 4x4 snapshot -->
  <div class="mt-4 grid grid-cols-4 gap-2">
    {#each puzzle.words.slice(0,16) as w}
      <div class="text-center text-[#cfe1ff] text-xs border border-[#26395e] rounded-md py-1 px-2 bg-[#0f1830]">
        {w.text}
      </div>
    {/each}
  </div>
</a>




