<script lang="ts">
  import { onMount, tick } from 'svelte';
  import GameBoard from '$lib/components/GameBoard.svelte';
  export let data: { id: string; puzzle: any };

  // Demo toggles + brand color
  const isDemo = data.id === 'example';
  const BRAND = '#14b8a6';
  const CURSOR_SRC = '/demo-cursor.png'; // make sure this exists in /static

  onMount(() => {
    document.documentElement.style.setProperty('--brand', BRAND);
  });

  // ----- Demo cursor + auto-solve (runs only when isDemo) -----
  let autoPlaying = false;
  let abortDemo = false;
  let cursorX = 0, cursorY = 0;
  let showCursor = false;

  const pause = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Find a word button in the grid
  function findWordButton(word: string): HTMLButtonElement | null {
    // Prefer the explicit data attribute we set on GameBoard buttons
    const byData = document.querySelector<HTMLButtonElement>(
      `button[data-word="${CSS.escape(word)}"]`
    );
    if (byData) return byData;

    // Fallback: match by visible text (works if the card hasn't flipped yet)
    const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-selected]');
    for (const b of buttons) {
      if (b.textContent?.trim() === word) return b;
    }
    return null;
  }

  async function moveCursorOver(el: Element, ms = 280) {
    const r = el.getBoundingClientRect();
    cursorX = r.left + r.width / 2 + window.scrollX;
    cursorY = r.top + r.height / 2 + window.scrollY;
    showCursor = true;
    await pause(ms);
  }

  async function clickWord(word: string) {
    const btn = findWordButton(word);
    if (!btn) return;
    await moveCursorOver(btn, 240);
    btn.click();
    await tick();
    await pause(140);
  }

  async function autoSolve() {
    if (!isDemo || autoPlaying) return;
    autoPlaying = true;
    abortDemo = false;

    // Use the categories delivered by the loader (DEMO has them baked in)
    for (const cat of (data.puzzle?.categories ?? [])) {
      if (abortDemo) break;
      for (const w of (cat.words ?? [])) {
        if (abortDemo) break;
        await clickWord(String(w));
      }
      // Let GameBoard resolve/flip after 4 picks
      await pause(360);
    }

    showCursor = false;
    autoPlaying = false;
  }

  function stopAuto() {
    abortDemo = true;
    showCursor = false;
    autoPlaying = false;
  }
</script>

<svelte:head>
  <title>{data?.puzzle?.title ? `${data.puzzle.title} – Play` : 'Play Puzzle'}</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-2xl font-semibold">{data.puzzle?.title ?? 'Puzzle'}</h1>
      {#if data.puzzle?.description}
        <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{data.puzzle.description}</p>
      {/if}
    </div>

    {#if isDemo}
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-md bg-[color:var(--brand)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 disabled:opacity-50"
          on:click={autoSolve}
          disabled={autoPlaying}
        >
          {autoPlaying ? 'Playing…' : 'Auto-solve (cursor)'}
        </button>

        {#if autoPlaying}
          <button
            type="button"
            class="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            on:click={stopAuto}
          >
            Stop
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <GameBoard
    puzzleId={data.id}
    puzzle={data.puzzle}
    showControls
    DEBUG={false}
  />

  {#if isDemo}
    <!-- Demo cursor overlay -->
    <div
      class="pointer-events-none fixed z-50 h-6 w-6 -translate-x-1/2 -translate-y-1/2 transform md:h-7 md:w-7 transition-all duration-300 ease-out"
      style="
        left: {cursorX}px;
        top: {cursorY}px;
        opacity: {showCursor ? 0.95 : 0};
        background-image: url('{CURSOR_SRC}');
        background-size: contain;
        background-repeat: no-repeat;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,.25));
      "
      aria-hidden="true"
    />
  {/if}
</main>

