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












