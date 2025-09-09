<!-- src/routes/demo-slot/+page.svelte -->
<script lang="ts">
  import GameBoard from "$lib/components/GameBoard.svelte";
  const PID = 1; // change if your puzzle id is different
</script>

<!-- Use the default grid (fallback) but suppress the toolbar via an empty toolbar slot -->
<GameBoard puzzleId={PID}>
  <div slot="toolbar"></div>
</GameBoard>


