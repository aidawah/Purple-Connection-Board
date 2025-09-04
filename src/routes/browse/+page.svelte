<script lang="ts">
  export const ssr = false;

  import { onMount } from "svelte";
  import PuzzleSnapshot from "$lib/components/PuzzleSnapshot.svelte";
  import { MOCK_PUZZLES } from "$lib/dev/puzzles";
  import type { Puzzle } from "$lib/types";

  // ---- state
  let loading = true;
  let tab: "recent" | "mine" | "pinned" | "published" | "assigned" = "recent";
  let q = "";
  let all: Puzzle[] = [];
  let pins = new Set<string>();
let completed = new Set<string>();              
let limit = 24;

// toolbar tabs (added "completed")
const TABS = ["recent", "mine", "pinned", "published", "assigned", "completed"] as const;


  
 

  // Placeholder for now (replace with auth displayName later)
  let currentUserName = "Demo User";

  onMount(() => {
    const toMillis = (x: any) =>
      !x ? 0 : typeof x === "number" ? x : x.seconds ? x.seconds * 1000 : (Date.parse(x) || 0);

    all = [...MOCK_PUZZLES].sort((a: any, b: any) => toMillis(b.createdAt) - toMillis(a.createdAt));

    try {
      const raw = localStorage.getItem("pins");
      if (raw) pins = new Set(JSON.parse(raw));
    } catch {}
    try {
  const rawC = localStorage.getItem("completed");
  if (rawC) completed = new Set(JSON.parse(rawC));
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
    const isCompleted = (p: any) =>
  completed.has(p.id) ||
  (Array.isArray(p.completedBy) &&
   p.completedBy.some((n: string) => n?.toLowerCase?.() === currentUserName.toLowerCase()));


  const isAssigned = (p: any) =>
    Array.isArray(p.assignees) &&
    p.assignees.some((n: string) => n?.toLowerCase?.() === currentUserName.toLowerCase());

  // derived lists
  $: recent    = all.filter(matchesSearch);
  $: mine      = all.filter((p) => isOwner(p)).filter(matchesSearch);
  $: pinned    = all.filter((p) => pins.has(p.id)).filter(matchesSearch);
  $: published = all.filter((p: any) => !!p.isPublished).filter(matchesSearch);
  $: assigned  = all.filter((p) => isAssigned(p)).filter(matchesSearch);
  $: completedList = all.filter((p) => isCompleted(p)).filter(matchesSearch); 


 $: counts = {
  recent:    recent.length,
  mine:      mine.length,
  pinned:    pinned.length,
  published: published.length,
  assigned:  assigned.length,
  completed: completedList.length
} as Record<"recent"|"mine"|"pinned"|"published"|"assigned"|"completed", number>;


  // active list by tab
  $: activeList =
  tab === "recent"    ? recent :
  tab === "mine"      ? mine :
  tab === "pinned"    ? pinned :
  tab === "published" ? published :
  tab === "assigned"  ? assigned :
                        completedList;           // ⬅ NEW


  function loadMore() { limit += 24; }
</script>

<!-- Toolbar with title (left), tabs (middle), search (right) -->
<div class="page page--toolbar">
  <div class="toolbar toolbar--browse">
    <h1 class="toolbar-title">Browse Puzzles</h1>

    <div class="tabs">
      {#each TABS as t}
        <button
          class="tab"
          class:is-active={tab === t}
          on:click={() => (tab = t, limit = 24)}
          title={`Show ${t}`}
        >
        <span class="tab-label">{t[0].toUpperCase()+t.slice(1)}</span>
<span class="tab-count">({counts[t]})</span>

        </button>
      {/each}
    </div>

    <div class="spacer"></div>

    <input
      placeholder="Search title or word…"
      bind:value={q}
      class="btn search"
    />
  </div>
</div>

<!-- Content -->
<div class="page page--list">
  {#if loading}
    <p style="opacity:.7">Loading…</p>
  {:else if activeList.length === 0}
    <p style="opacity:.7">No puzzles found.</p>
  {:else}
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
      {#each activeList.slice(0, limit) as p (p.id)}
        <PuzzleSnapshot
          puzzle={p}
          pinned={pins.has(p.id)}
          on:pin={(e) => setPin(e.detail.id, e.detail.pinned)}
        />
      {/each}
    </div>

    {#if activeList.length > limit}
      <div style="display:flex;justify-content:center;margin-top:16px">
        <button class="btn btn-ghost" on:click={loadMore}>Load more</button>
      </div>
    {/if}
  {/if}
</div>


