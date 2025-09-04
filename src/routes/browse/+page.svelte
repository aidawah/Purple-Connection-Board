<script lang="ts">
  export const ssr = false;

  import { onMount } from "svelte";
  import PuzzleSnapshot from "$lib/components/PuzzleSnapshot.svelte";
  import { MOCK_PUZZLES } from "$lib/dev/puzzles";
  import type { Puzzle } from "$lib/types";

  let loading = true;
  let tab: "recent" | "mine" | "pinned" | "published" | "assigned" | "completed" = "recent";
  let q = "";
  let all: Puzzle[] = [];
  let pins = new Set<string>();
  let limit = 24;

  const TABS = ["recent", "mine", "pinned", "published", "assigned", "completed"] as const;

  let currentUserName = "Demo User";

  onMount(() => {
    const toMillis = (x: any) =>
      !x ? 0 : typeof x === "number" ? x : x.seconds ? x.seconds * 1000 : (Date.parse(x) || 0);
    all = [...MOCK_PUZZLES].sort((a: any, b: any) => toMillis(b.createdAt) - toMillis(a.createdAt));

    try {
      const raw = localStorage.getItem("pins");
      if (raw) pins = new Set(JSON.parse(raw));
    } catch {}
    loading = false;
  });

  function setPin(id: string, on: boolean) {
    on ? pins.add(id) : pins.delete(id);
    localStorage.setItem("pins", JSON.stringify([...pins]));
  }

  function matchesSearch(p: Puzzle) {
    if (!q.trim()) return true;
    const qq = q.toLowerCase();
    return (
      (p.title ?? "").toLowerCase().includes(qq) ||
      (p.words ?? []).some((w) => (w.text ?? "").toLowerCase().includes(qq))
    );
  }

  const isOwner = (p: any) =>
    p.ownerName?.toLowerCase?.() === currentUserName.toLowerCase() ||
    p.ownerId?.toLowerCase?.() === currentUserName.toLowerCase();

  const isAssigned = (p: any) =>
    Array.isArray(p.assignees) &&
    p.assignees.some((n: string) => n?.toLowerCase?.() === currentUserName.toLowerCase());

  const isCompleted = (p: any) =>
    !!p.completed ||
    (Array.isArray(p.completedBy) &&
      p.completedBy.some((n: string) => n?.toLowerCase?.() === currentUserName.toLowerCase())) ||
    (Array.isArray(p.completions) &&
      p.completions.some(
        (r: any) =>
          r.user?.toLowerCase?.() === currentUserName.toLowerCase() || r.userId === currentUserName
      ));

  $: recent    = all.filter(matchesSearch);
  $: mine      = all.filter((p) => isOwner(p)).filter(matchesSearch);
  $: pinned    = all.filter((p) => pins.has(p.id)).filter(matchesSearch);
  $: published = all.filter((p: any) => !!p.isPublished).filter(matchesSearch);
  $: assigned  = all.filter((p) => isAssigned(p)).filter(matchesSearch);
  $: completed = all.filter((p) => isCompleted(p)).filter(matchesSearch);

  $: counts = {
    recent:    recent.length,
    mine:      mine.length,
    pinned:    pinned.length,
    published: published.length,
    assigned:  assigned.length,
    completed: completed.length
  } as Record<(typeof TABS)[number], number>;

  $: activeList =
    tab === "recent"    ? recent :
    tab === "mine"      ? mine :
    tab === "pinned"    ? pinned :
    tab === "published" ? published :
    tab === "assigned"  ? assigned :
                           completed;

  function loadMore() { limit += 24; }
</script>

<!-- Toolbar -->
<div class="max-w-7xl mx-auto px-6 pt-6">
  <div
    class="sticky top-0 z-10
           flex items-center justify-center gap-3
           px-4 py-3 mb-4
           rounded-2xl border border-[#1a2a43]
           bg-gradient-to-b from-[rgba(18,26,43,.85)] to-[rgba(18,26,43,.65)]
           backdrop-blur-md"
  >
    <h1 class="m-0 text-[22px] font-extrabold whitespace-nowrap">Browse Puzzles</h1>

    <div class="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {#each TABS as t}
        <button
          on:click={() => (tab = t, limit = 24)}
          data-active={tab === t}
          class="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full border font-semibold tracking-[.2px]
                 whitespace-nowrap bg-[#0f1830] text-[#cfe1ff] border-[#2a4067]
                 hover:border-[#18837a]
                 active:[box-shadow:inset_0_0_0_2px_rgba(20,184,166,.35)]
                 data-[active=true]:bg-[#14b8a6] data-[active=true]:text-[#053b3a]
                 data-[active=true]:border-[#0ea5a5]
                 data-[active=true]:shadow-[0_0_0_2px_rgba(20,184,166,.25)]"
        >
          <span class="capitalize">{t}</span>
          <span class="opacity-90">({counts[t]})</span>
        </button>
      {/each}
    </div>

    <input
      placeholder="Search title or word…"
      bind:value={q}
      class="h-9 px-3 rounded-lg border border-[#2a4067] bg-[#0f1830] text-[#cfe1ff]
             outline-none flex-[0_1_200px] min-w-[160px] focus:ring-2 focus:ring-[#14b8a6]/50"
    />
  </div>
</div>

<!-- Content -->
<div class="max-w-7xl mx-auto px-6 pb-8">
  {#if loading}
    <p class="opacity-70">Loading…</p>
  {:else if activeList.length === 0}
    <p class="opacity-70">No puzzles found.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each activeList.slice(0, limit) as p (p.id)}
        <PuzzleSnapshot
          puzzle={p}
          pinned={pins.has(p.id)}
          on:pin={(e) => setPin(e.detail.id, e.detail.pinned)}
        />
      {/each}
    </div>

    {#if activeList.length > limit}
      <div class="flex justify-center mt-4">
        <button
          class="inline-flex items-center h-9 px-3 rounded-lg border border-[#2a4067] text-[#cfe1ff]
                 bg-transparent hover:bg-[#14223d]"
          on:click={loadMore}
        >
          Load more
        </button>
      </div>
    {/if}
  {/if}
</div>



