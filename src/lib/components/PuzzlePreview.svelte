<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  /** Use either `preview` OR `puzzleId` (the component will fetch when visible). */
  export let puzzleId: string | undefined;
  export let preview:
    | { size?: string; words: string[] }   // e.g. 16 words → 4×4
    | undefined;

  // Internal state
  let container: HTMLDivElement | null = null;
  let words: string[] = [];
  let loaded = false;
  let errored = false;

  // Compute N from words length; defaults to 4.
  $: n = Math.max(2, Math.min(8, Math.round(Math.sqrt(words.length || 16))));

  function makeSkeleton(count = 16) {
    return Array.from({ length: count }, () => '');
  }
  let skeleton = makeSkeleton();

  async function fetchPreview() {
    if (!browser || loaded || !puzzleId) return;
    try {
      const fb = await import('$lib/firebase');
      // expects a function you’ll add below
      const data = await fb.fetchPuzzlePreview(puzzleId);
      words = (data?.words ?? []).slice(0, 16);
      if (!words.length) {
        // show graceful empty state
        words = [];
      }
      loaded = true;
    } catch (e) {
      console.error('Preview fetch failed:', e);
      errored = true;
      loaded = true;
    }
  }

  onMount(() => {
    if (!browser || preview) {
      // If preview passed in, use it immediately
      if (preview?.words?.length) {
        words = preview.words.slice(0, 16);
        loaded = true;
      }
      return;
    }
    // Lazy-load only when visible
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fetchPreview();
          io.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (container) io.observe(container);
    return () => io.disconnect();
  });
</script>

<!--
  Wrapper keeps the same aspect ratio as your card header.
  We keep it self-contained so you can drop it anywhere.
-->
<div
  bind:this={container}
  class="relative aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-[color:var(--brand)]/10 to-emerald-200/20 dark:from-[color:var(--brand)]/20 dark:to-emerald-900/10"
  aria-label="Puzzle preview"
>
  <!-- Mini grid -->
  <div
    class="absolute inset-0 grid p-2"
    style={`grid-template-columns: repeat(${n}, minmax(0, 1fr)); grid-template-rows: repeat(${n}, minmax(0, 1fr)); gap: .375rem;`}
  >
    {#if !loaded && !preview}
      {#each skeleton as _, i}
        <div
          class="animate-pulse rounded-md border border-zinc-200/60 bg-white/70 dark:border-zinc-700 dark:bg-zinc-800"
          aria-hidden="true"
        />
      {/each}
    {:else if errored}
      <div class="col-span-full row-span-full grid place-items-center text-xs text-zinc-500">
        Preview unavailable
      </div>
    {:else if words.length === 0}
      <div class="col-span-full row-span-full grid place-items-center text-xs text-zinc-500">
        No words yet
      </div>
    {:else}
      {#each words as w, i}
        <div
          class="truncate rounded-md border border-zinc-200/70 bg-white px-2 py-1 text-[10px] leading-tight text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          title={w}
        >
          {w}
        </div>
      {/each}
    {/if}
  </div>

  <!-- subtle top gradient for depth (keeps your look) -->
  <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 to-black/0 dark:from-black/0 dark:to-black/0" />
</div>
