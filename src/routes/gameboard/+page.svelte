<script lang="ts">
  import { MOCK_PUZZLES } from "$lib/dev/puzzles";
  import type { Puzzle } from "$lib/types";

  const puzzles: Puzzle[] = MOCK_PUZZLES;

  // robust timestamp -> millis
  const toMillis = (x: any) =>
    !x ? 0 : typeof x === "number" ? x : x?.seconds ? x.seconds * 1000 : (Date.parse(x) || 0);

  // newest first
  const sorted = [...puzzles].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

  function fmtDate(x: any) {
    const ms = toMillis(x);
    if (!ms) return "unknown";
    const d = new Date(ms);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
</script>

<!-- Header / toolbar -->
<div class="max-w-7xl mx-auto px-6 py-8 space-y-6">
  <div
    class="sticky top-0 z-10 flex flex-wrap items-center gap-3 px-4 py-3
           rounded-2xl border border-[#1a2a43]
           bg-gradient-to-b from-[rgba(18,26,43,.85)] to-[rgba(18,26,43,.65)]
           backdrop-blur-md"
  >
    <h1 class="m-0 text-xl font-bold">Choose a Puzzle</h1>
    <div class="flex-1" />
    <a
      href="/gameboard/demo-1"
      class="inline-flex items-center h-9 px-3 rounded-lg font-semibold
             border border-[#2a4067] text-[#cfe1ff] bg-[#0f1830] hover:bg-[#14223d]"
      >Open Demo 1</a
    >
    <a
      href="/gameboard/demo-2"
      class="inline-flex items-center h-9 px-3 rounded-lg font-semibold
             border border-[#2a4067] text-[#cfe1ff] bg-[#0f1830] hover:bg-[#14223d]"
      >Open Demo 2</a
    >
    <a
      href="/browse"
      class="inline-flex items-center h-9 px-3 rounded-lg font-semibold
             border border-[#2a4067] text-[#cfe1ff] bg-transparent hover:bg-[#14223d]"
      >Browse</a
    >
  </div>

  {#if sorted.length === 0}
    <p class="opacity-70">No puzzles available.</p>
  {:else}
    <!-- Grid of available puzzles (links to /gameboard/[id]) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each sorted as p (p.id)}
        <a
          href={`/gameboard/${p.id}`}
          class="block rounded-2xl border border-[#1a2a43] p-4
                 bg-gradient-to-b from-[rgba(13,20,38,.85)] to-[rgba(13,20,38,.65)]
                 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,.35)]
                 hover:border-[#2a4067] transition"
        >
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-base font-semibold text-[#eaf2ff] line-clamp-1">{p.title}</h2>
            <span
              class="shrink-0 inline-flex items-center rounded-full h-6 px-2 text-xs
                     text-[#0f766e] bg-[rgba(20,184,166,.16)] border border-[rgba(20,184,166,.35)]"
              >16 words</span
            >
          </div>
          <p class="mt-1 text-xs text-[#9fb1d1]">Created {fmtDate(p.createdAt)}</p>

          <!-- Tiny 4x4 preview of word chips -->
          <div class="mt-3 grid grid-cols-4 gap-1.5">
            {#each p.words.slice(0, 16) as w (w.id)}
              <span
                class="text-[11px] truncate text-[#cfe1ff]
                       border border-[#26395e] rounded-md px-1.5 py-1 bg-[#0f1830]"
                title={w.text}
              >
                {w.text}
              </span>
            {/each}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>


