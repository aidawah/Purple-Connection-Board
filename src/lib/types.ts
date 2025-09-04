<!-- src/routes/gameboard/[puzzleId]/+page.svelte -->
<script lang="ts">
  export const ssr = false;
  import { page } from "$app/stores";
</script>

<h1>Gameboard route ✅</h1>
<p>puzzleId: {$page.params.puzzleId}</p>
