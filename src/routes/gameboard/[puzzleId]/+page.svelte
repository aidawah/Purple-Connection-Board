<script lang="ts">
  import GameBoard from '$lib/components/GameBoard.svelte';
  export let data: { id: string; puzzle: any };
</script>

<svelte:head>
  <title>{data?.puzzle?.title ? `${data.puzzle.title} – Play` : 'Play Puzzle'}</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8">
  <div class="mb-4">
    <h1 class="text-2xl font-semibold">{data?.puzzle?.title ?? 'Puzzle'}</h1>
    {#if data?.puzzle?.description}
      <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {data.puzzle.description}
      </p>
    {/if}
  </div>

  <GameBoard
    puzzleId={data.id}
    puzzle={data.puzzle}
    showControls
    DEBUG={false}
  />
</main>
