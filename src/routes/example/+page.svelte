<script lang="ts">
  import { onMount, tick } from "svelte";

  const BRAND = "#14b8a6";

  // --- Demo puzzle (clear & friendly) ---
  type Cat = { name: string; words: string[] };
  type Puzzle = { title: string; categories: Cat[] };

  const BASE: Puzzle = {
    title: "Example Demo: Learn the Connections",
    categories: [
      { name: "Breakfast Foods", words: ["Pancakes", "Omelet", "Bagel", "Yogurt"] },
      { name: "Blue Things",      words: ["Sky", "Jeans", "Sapphire", "Ocean"] },
      { name: "Dog Breeds",       words: ["Beagle", "Poodle", "Bulldog", "Husky"] },
      { name: "Computer Parts",   words: ["CPU", "Mouse", "Keyboard", "Monitor"] }
    ]
  };

  // --- utils ---
  function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildBoard(p: Puzzle) {
    // flat list of all words + a quick lookup of word -> categoryName
    const flat = p.categories.flatMap((c) => c.words);
    const mapping = new Map<string, string>();
    p.categories.forEach((c) => c.words.forEach((w) => mapping.set(w, c.name)));
    return { flat: shuffle(flat), mapping };
  }

  // --- reactive state for this page ---
  let puzzle: Puzzle = BASE;
  let board = buildBoard(puzzle);
  let selected = new Set<string>();
  let solvedGroups: { name: string; words: string[] }[] = []; // shown as locked rows at the top
  let mistakes = 0;
  let message = "";
  let animPulse = false;
  let autoPlaying = false;

  $: remainingWords = board.flat.filter((w) => !solvedGroups.some((g) => g.words.includes(w)));
  $: categoryCount = puzzle.categories.length;
  $: wordCount = puzzle.categories.reduce((n, c) => n + c.words.length, 0);

  onMount(() => {
    document.documentElement.style.setProperty("--brand", BRAND);
  });

  function resetBoard() {
    selected.clear();
    solvedGroups = [];
    mistakes = 0;
    message = "";
    autoPlaying = false;
    puzzle = { ...BASE, categories: BASE.categories.map(c => ({ name: c.name, words: c.words.slice() })) };
    board = buildBoard(puzzle);
  }

  function toggleSelect(word: string) {
    if (autoPlaying) return;
    // prevent clicking locked words
    if (solvedGroups.some((g) => g.words.includes(word))) return;

    const next = new Set(selected);
    if (next.has(word)) next.delete(word);
    else next.add(word);
    selected = next;
    message = "";
  }

  function submitSelection() {
    if (selected.size !== 4) {
      message = "Select 4 words to submit a group.";
      pulse();
      return;
    }
    const words = Array.from(selected);
    const cats = words.map((w) => board.mapping.get(w));
    const allSame = cats.every((c) => c && c === cats[0]);

    if (allSame) {
      // correct group: lock as solved (keep original category name)
      solvedGroups = [
        ...solvedGroups,
        { name: cats[0] as string, words: words.slice() }
      ];
      // clear selection
      selected = new Set<string>();

      // if all 4 groups solved:
      if (solvedGroups.length === 4) {
        message = "🎉 You solved the puzzle!";
      } else {
        message = "Nice! Group locked.";
      }
    } else {
      mistakes += 1;
      message = "Not quite. Try a different combination.";
      pulse();
    }
  }

  function pulse() {
    animPulse = true;
    setTimeout(() => (animPulse = false), 250);
  }

  function shuffleWords() {
    if (autoPlaying) return;
    const left = remainingWords;
    const locked = solvedGroups.flatMap((g) => g.words);
    const res = shuffle(left).concat(locked); // keep locked words at end for visual separation
    board = { ...board, flat: res };
    selected = new Set<string>();
    message = "Shuffled the remaining words.";
  }

  // --- Auto-play: solves each category step-by-step with small delays ---
  async function autoplay() {
    if (autoPlaying) return;
    autoPlaying = true;
    message = "Auto-solve is playing…";
    selected = new Set<string>();

    // Build ordered list of remaining categories to solve
    const remainingCats = puzzle.categories
      .filter((c) => !solvedGroups.some((g) => g.name === c.name));

    for (const cat of remainingCats) {
      if (!autoPlaying) break;

      // Step 1: ensure all category words are visible (they always are)
      await pause(300);

      // Step 2: select the four words in this category one by one
      for (const w of cat.words) {
        // Might already be locked, skip
        if (solvedGroups.some((g) => g.words.includes(w))) continue;
        selected = new Set([...selected, w]);
        await pause(180);
      }

      // Step 3: submit this group
      submitSelection();
      await tick();
      await pause(300);
    }

    // Small flourish
    if (solvedGroups.length === 4) {
      message = "🤖 Auto-solve complete!";
    }
    autoPlaying = false;
  }

  function pause(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
</script>

<svelte:head>
  <title>Example Game • Purple Connection Board</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8 md:py-10">
  <!-- Header -->
  <section class="mb-6 md:mb-8">
    <div class="mx-auto mb-3 h-1 w-28 rounded-full [background:color:var(--brand)]/70"></div>
    <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-bold tracking-tight md:text-3xl">
          Example Game
          <span class="ml-2 align-middle rounded-full bg-[color:var(--brand)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--brand)] ring-1 ring-[color:var(--brand)]/30">
            Demo
          </span>
        </h1>
        <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Try the game here or let it auto-solve itself to learn the flow.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:inline">Categories: {categoryCount} • Words: {wordCount}</span>

        <button
          type="button"
          on:click={shuffleWords}
          class="rounded-md border border-[color:var(--brand)]/30 px-3 py-1.5 text-sm font-medium text-[color:var(--brand)] transition-colors hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 disabled:opacity-50"
          disabled={autoPlaying}
        >
          Shuffle
        </button>

        <button
          type="button"
          on:click={resetBoard}
          class="rounded-md border border-[color:var(--brand)]/30 px-3 py-1.5 text-sm font-medium text-[color:var(--brand)] transition-colors hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 disabled:opacity-50"
          disabled={autoPlaying}
        >
          Reset
        </button>

        <button
          type="button"
          on:click={autoplay}
          class="rounded-md bg-[color:var(--brand)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 disabled:opacity-50"
          disabled={autoPlaying || solvedGroups.length === 4}
        >
          {autoPlaying ? "Playing…" : "Auto-solve"}
        </button>

        <a
          href="/"
          class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back
        </a>
      </div>
    </div>
  </section>

  <!-- Tips -->
  <section class="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-5">
    <div class="flex items-start gap-3">
      <div class="mt-0.5 hidden h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--brand)]/15 text-[color:var(--brand)] ring-1 ring-[color:var(--brand)]/30 md:flex">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5Zm.75 5.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM11 10.5a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6Z"/></svg>
      </div>
      <div>
        <h2 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">How to play</h2>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Select 4 words that belong together.</li>
          <li>Submit to lock the group.</li>
          <li>Clear all 4 groups to win!</li>
        </ol>
      </div>
    </div>
  </section>

  <!-- Locked/Solved groups -->
  {#if solvedGroups.length}
    <section class="mb-3 grid grid-cols-1 gap-2">
      {#each solvedGroups as g, i}
        <div class="rounded-lg border border-[color:var(--brand)]/40 bg-[color:var(--brand)]/5 px-3 py-2 text-sm dark:border-[color:var(--brand)]/40 dark:bg-[color:var(--brand)]/15">
          <div class="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">{g.name}</div>
          <div class="flex flex-wrap gap-2">
            {#each g.words as w}
              <span class="rounded bg-white px-2 py-1 text-xs ring-1 ring-[color:var(--brand)]/30 dark:bg-zinc-900">{w}</span>
            {/each}
          </div>
        </div>
      {/each}
    </section>
  {/if}

  <!-- Message bar -->
  {#if message}
    <div class="mb-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      {message} {#if mistakes>0}• Mistakes: {mistakes}{/if}
    </div>
  {/if}

  <!-- Board -->
  <section class="rounded-xl border border-zinc-200 p-3 shadow-sm dark:border-zinc-800 md:p-4">
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {#each remainingWords as w}
        <!-- selected/feedback styles -->
        <button
          type="button"
          on:click={() => toggleSelect(w)}
          class={
            [
              "h-12 rounded-lg border px-2 text-sm font-medium transition focus:outline-none focus:ring-2",
              "border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-900",
              selected.has(w) ? "ring-2 ring-[color:var(--brand)]/60 border-[color:var(--brand)]/60" : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
              animPulse && !selected.has(w) ? "animate-pulse" : ""
            ].join(" ")
          }
          disabled={autoPlaying}
        >
          {w}
        </button>
      {/each}
    </div>

    <!-- Submit -->
    <div class="mt-3 flex items-center justify-end gap-2">
      <span class="text-xs text-zinc-500 dark:text-zinc-400">Selected: {selected.size}/4</span>
      <button
        type="button"
        on:click={submitSelection}
        class="rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 disabled:opacity-50"
        disabled={autoPlaying}
      >
        Submit Group
      </button>
    </div>
  </section>

  <!-- Footnote -->
  <p class="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
    This demo doesn’t save progress. Visit <a href="/create" class="text-[color:var(--brand)] underline-offset-2 hover:underline">Create</a> to build and save your own puzzles.
  </p>
</main>

<style>
  /* minimal pulse keyframes for quick feedback (fallback if Tailwind's animate-pulse isn't ideal) */
</style>
