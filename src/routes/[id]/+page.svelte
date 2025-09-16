<script lang="ts">
  import GameBoard from '$lib/components/GameBoard.svelte';
  export let data: { id: string; puzzle: any | null };

  // GameBoard expects: { id, title, words: Array<{ id, text, groupId }> }
  // Your Firestore doc has: { title, categories: [{ title, words: string[] }], ... }
  const groupLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const adapted = (() => {
    const p = data?.puzzle;
    if (!p) return null;

    // If it's already in the shape GameBoard wants, use it directly.
    if (Array.isArray(p.words)) {
      return { id: data.id, title: p.title ?? 'Untitled', words: p.words };
    }

    // Otherwise, adapt from categories -> words[]
    const cats = Array.isArray(p.categories) ? p.categories : [];
    const words = cats.flatMap((cat, ci) => {
      const arr = Array.isArray(cat?.words) ? cat.words : [];
      const gid = groupLetters[ci] ?? 'A';
      return arr
        .filter((w) => (w ?? '').trim().length > 0)
        .map((w, wi) => ({
          id: `${ci}-${wi}`,
          text: String(w).trim(),
          groupId: gid as any
        }));
    });

    return { id: data.id, title: p.title ?? 'Untitled', words };
  })();
</script>

{#if adapted}
  <div class="mx-auto max-w-6xl px-4 py-6">
    <GameBoard puzzleId={adapted.id} puzzle={adapted} />
  </div>
{:else}
  <div class="mx-auto max-w-2xl px-4 py-16">
    <h1 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Puzzle not found</h1>
    <p class="mt-2 text-zinc-600 dark:text-zinc-300">
      We couldn’t find a puzzle with ID
      <code class="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">{data.id}</code>.
    </p>
  </div>
{/if}
