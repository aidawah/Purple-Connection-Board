<script context="module" lang="ts">
  export const ssr = false;
</script>

<script lang="ts">
  import { page } from '$app/stores';
  import GameBoard from '$lib/components/GameBoard.svelte';
</script>

<GameBoard puzzleId={1}>
  <!-- Provide an empty toolbar slot to remove it -->
  <svelte:fragment slot="toolbar" />
</GameBoard>

<main class="mx-auto max-w-5xl px-4 pt-8">
  <h1 class="text-2xl font-bold mb-4">Game</h1>
  <GameBoard puzzleId={$page.params.puzzleId} />
</main>












