<script lang="ts">
  import { onMount } from 'svelte';

  type Puzzle = { id: string; title: string; updatedAt: string; status: 'draft' | 'published' };
  let puzzles: Puzzle[] = [];

  onMount(() => {
    // Replace with real fetch later; localStorage used as a placeholder
    const raw = localStorage.getItem('myPuzzles');
    puzzles = raw ? JSON.parse(raw) : [];
  });
</script>

<main class="mx-auto max-w-5xl px-4 py-6">
  <header class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">My Puzzles</h1>
    <a
      href="/create"
      class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:brightness-105"
      >Create new</a
    >
  </header>

  {#if puzzles.length === 0}
    <div class="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
      <p class="text-zinc-700 dark:text-zinc-300">You don’t have any puzzles yet.</p>
      <a href="/create" class="mt-3 inline-block rounded-md border px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Start one →</a>
    </div>
  {:else}
    <ul class="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {#each puzzles as p}
        <li class="flex items-center justify-between gap-4 p-4">
          <div>
            <div class="font-medium">{p.title}</div>
            <div class="text-xs text-zinc-500 dark:text-zinc-400">
              {p.status} • Updated {new Date(p.updatedAt).toLocaleString()}
            </div>
          </div>
          <div class="flex gap-2">
            <a href={`/create?id=${encodeURIComponent(p.id)}`} class="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Edit</a>
            <a href={`/projects/${encodeURIComponent(p.id)}`} class="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">View</a>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</main>
