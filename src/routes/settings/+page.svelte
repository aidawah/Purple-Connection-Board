<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/profile?tab=settings', { replaceState: true });
  });
</script>

<svelte:head>
  <title>Settings • Purple Connection Board</title>
</svelte:head>

<!-- Loading state while redirecting -->
<div class="fixed inset-0 z-50 grid place-items-center bg-white/70 dark:bg-zinc-900/70">
  <div class="rounded-xl bg-white px-4 py-3 text-sm shadow dark:bg-zinc-900">
    Redirecting to settings...
  </div>
</div>
