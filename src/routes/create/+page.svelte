<script lang="ts">
  import GameBoard from '$lib/components/GameBoard.svelte';
  import type { Puzzle } from '$lib/types';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';

  // URL param
  let puzzleId = '';
  let title = '';
  let categoryCount = 4;
  let wordCount = 4;
  let categories: { name: string; words: string[] }[] = [];

  // ---- SSR-safe localStorage helper ----
  const ls = {
    get(key: string) { if (!browser) return null; try { return localStorage.getItem(key); } catch { return null; } },
    set(key: string, val: string) { if (!browser) return; try { localStorage.setItem(key, val); } catch {} }
  };

  // computed preview data
  $: previewWords = categories.flatMap((cat) => cat.words);
  $: previewGroups = (() => {
    const groups: number[][] = [];
    let offset = 0;
    for (const cat of categories) {
      const indices = cat.words.map((_, idx) => offset + idx);
      groups.push(indices);
      offset += cat.words.length;
    }
    return groups;
  })();

  // UI state
  let generating = false;
  let saving = false;
  let statusMsg = '';
  let statusType: 'info' | 'success' | 'error' = 'info';
  let showDebug = false;

  // Debug mock
  $: debug = {
    'Selected Words': [],
    'Selected grid indices': [],
    'Selected grid states': [],
    Order: '[] - orig: [] (0-3,4-7,8-11,12-15) – ' + 'flags: ' + JSON.stringify(Array(16).fill(false)),
    SolvedGroup: JSON.stringify(Array(categoryCount).fill(false)),
    SolvedGroup2: JSON.stringify(Array(4).fill(false))
  };

  // Draft key
  const draftKey = () => `create_draft_${puzzleId}`;

  function initCategories() {
    categories = Array.from({ length: categoryCount }, () => ({
      name: '',
      words: Array.from({ length: wordCount }, () => '')
    }));
  }

  onMount(() => {
    puzzleId = get(page).params.id ?? '';
    const raw = ls.get(draftKey());
    if (raw) {
      try {
        const d = JSON.parse(raw);
        title = d.title ?? '';
        categoryCount = d.categoryCount ?? 4;
        wordCount = d.wordCount ?? 4;
        categories = Array.isArray(d.categories) ? d.categories : [];
      } catch {}
    }
    if (categories.length === 0) initCategories();
  });

  // Debounced draft save (SSR-safe)
  let t: any;
  function saveDraftSoon() {
    if (!browser) return;
    clearTimeout(t);
    t = setTimeout(() => {
      ls.set(draftKey(), JSON.stringify({ title, categoryCount, wordCount, categories }));
    }, 150);
  }

  // Keep arrays in sync with sliders
  $: if (categories.length !== categoryCount) {
    categories = [
      ...categories.slice(0, categoryCount),
      ...Array(Math.max(0, categoryCount - categories.length))
        .fill(0)
        .map(() => ({ name: '', words: Array(wordCount).fill('') }))
    ];
    if (browser) saveDraftSoon();
  }

  $: {
    categories = categories.map((cat) => ({
      name: cat.name,
      words: [
        ...cat.words.slice(0, wordCount),
        ...Array(Math.max(0, wordCount - cat.words.length)).fill('')
      ]
    }));
    if (browser) saveDraftSoon();
  }

  function clearAll() {
    title = '';
    categories = Array.from({ length: categoryCount }, () => ({
      name: '',
      words: Array.from({ length: wordCount }, () => '')
    }));
    ls.set(draftKey(), JSON.stringify({ title, categoryCount, wordCount, categories }));
    statusMsg = 'All categories and words cleared.';
    statusType = 'info';
  }

  async function generateAll() {
    try {
      for (let i = 0; i < categories.length; i++) {
        if (!categories[i].name.trim()) {
          statusMsg = `Please fill all Category before generating.`;
          statusType = 'error';
          return;
        }
      }
      generating = true;
      statusMsg = '';
      statusType = 'info';

      const payload = {
        categories: categories.map((c) => {
          const seed = c.words.filter((w) => w.trim().length > 0);
          const need = Math.max(0, wordCount - seed.length);
          return { name: c.name?.trim() || '', seedWords: seed, need };
        })
      };

      const totalNeed = payload.categories.reduce((n, x) => n + x.need, 0);
      if (totalNeed === 0) {
        statusMsg = 'All word slots are already filled.';
        statusType = 'success';
        return;
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`);

      const groups: string[][] = Array.isArray(data?.groups) ? data.groups : [];
      categories = categories.map((cat, i) => {
        const toFill = (groups[i] ?? []).map((w) => (w ?? '').trim()).filter(Boolean);
        if (!toFill.length) return cat;

        const filled = [...cat.words];
        let k = 0;
        for (let j = 0; j < filled.length && k < toFill.length; j++) {
          if (!filled[j] || !filled[j].trim()) filled[j] = toFill[k++];
        }
        return { ...cat, words: filled };
      });

      saveDraftSoon();
      statusMsg = 'Generated words added to empty slots.';
      statusType = 'success';
    } catch (err: any) {
      console.error(err);
      statusMsg = err?.message || 'Failed to generate words. Please try again.';
      statusType = 'error';
    } finally {
      generating = false;
    }
  }

  function onSave() {
    statusMsg = '';
    if (!title.trim()) {
      statusMsg = 'Title is required';
      statusType = 'error';
      return;
    }
    for (let i = 0; i < categories.length; i++) {
      if (!categories[i].name.trim()) {
        statusMsg = `Category #${i + 1} needs a name`;
        statusType = 'error';
        return;
      }
      for (let j = 0; j < categories[i].words.length; j++) {
        if (!categories[i].words[j].trim()) {
          statusMsg = `Word #${j + 1} in “${categories[i].name || `Category ${i + 1}`}” is empty`;
          statusType = 'error';
          return;
        }
      }
    }
    saving = true;
    statusMsg = `Saving puzzle ${puzzleId} (placeholder)…`;
    statusType = 'info';
    setTimeout(() => {
      saving = false;
      statusMsg = 'Saved successfully! (placeholder)';
      statusType = 'success';
    }, 700);
  }

  function goBack() {
    if (history.length > 1) history.back();
    else location.href = '/';
  }

// ---------- LIVE PREVIEW: Build a Puzzle for GameBoard (allow blanks) ----------
const GROUP_IDS = ["A","B","C","D"] as const;
function makeId(i:number,j:number,text:string){
  return `${i}-${j}-${(text||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
}

$: livePuzzle = (() => {
  // Keep it at classic 4×4 for now
  if (categoryCount !== 4 || wordCount !== 4) return null;

  // Ensure we always have 16 slots
  const all = categories.flatMap(c => c.words);
  if (all.length !== 16) return null;

  const words = categories.flatMap((c, i) =>
    c.words.map((w, j) => ({
      id: makeId(i, j, w),
      text: (w ?? '').trim(),        // may be ''
      groupId: GROUP_IDS[i]          // A..D
    }))
  );

  return {
    id: `live-${puzzleId || 'draft'}`,
    title: title?.trim() || 'Untitled Puzzle',
    words
  } as import('$lib/types').Puzzle;
})();
</script>

<!-- PAGE with teal brand accents -->
<div class="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
  <div class="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8">

    <!-- Header -->
    <div class="relative overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div class="absolute inset-x-0 -top-1 h-1 bg-brand/60"></div>
      <div class="flex items-center justify-between gap-2">
        <h1 class="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          Create Puzzle
          <span class="ml-2 align-middle rounded-full bg-brand/20 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-brand ring-1 ring-inset ring-brand/40">
            New
          </span>
        </h1>
        <span class="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
          ID: <span class="font-medium text-brand">{puzzleId}</span>
        </span>
      </div>
    </div>

    <!-- Title -->
    <div>
      <label for="title" class="mb-1 block text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
        Title
        <span class="ml-2 rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-brand ring-1 ring-inset ring-brand/50">required</span>
      </label>
      <input
        id="title"
        type="text"
        bind:value={title}
        on:input={saveDraftSoon}
        placeholder="e.g., Animals & Colors"
        class="w-full rounded-lg sm:rounded-xl border border-zinc-200 bg-white px-3 py-2 sm:py-2.5 text-sm sm:text-base text-zinc-900 placeholder-zinc-400
               shadow-sm focus:outline-none focus:ring-2 focus:ring-brand
               dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
      />
    </div>

    <!-- Sliders -->
    <div class="grid gap-4 sm:gap-6 sm:grid-cols-2">
      <div>
        <label for="categoryCount" class="mb-1 sm:mb-2 block text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          Categories: <span class="font-semibold text-zinc-900 dark:text-zinc-100">{categoryCount}</span>
        </label>
        <input id="categoryCount" type="range" min="2" max="8" bind:value={categoryCount} class="w-full accent-brand" />
        <p class="mt-1 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">How many groups your puzzle will have.</p>
      </div>
      <div>
        <label for="wordCount" class="mb-1 sm:mb-2 block text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          Words each: <span class="font-semibold text-zinc-900 dark:text-zinc-100">{wordCount}</span>
        </label>
        <input id="wordCount" type="range" min="2" max="8" bind:value={wordCount} class="w-full accent-brand" />
        <p class="mt-1 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">How many words go into each category.</p>
      </div>
    </div>

    <!-- Categories list -->
    <div class="space-y-3 sm:space-y-4">
      {#each categories as cat, i}
        <div class="rounded-xl sm:rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="sm:col-span-1">
              <label for={"cat-" + i} class="mb-1 block text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-400">Category {i + 1}</label>
              <input
                id={"cat-" + i}
                type="text"
                bind:value={cat.name}
                on:input={saveDraftSoon}
                placeholder="Category name"
                class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm sm:text-base text-zinc-900 placeholder-zinc-400
                       focus:outline-none focus:ring-2 focus:ring-brand
                       dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
            <div class="sm:col-span-3 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
              {#each cat.words as _, j}
                <input
                  id={`w-${i}-${j}`}
                  type="text"
                  bind:value={categories[i].words[j]}
                  on:input={saveDraftSoon}
                  placeholder={`Word ${j + 1}`}
                  class="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm sm:text-base text-zinc-900 placeholder-zinc-400
                         focus:outline-none focus:ring-2 focus:ring-brand
                         dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Live Preview -->
    <div class="mt-6 space-y-3">
      <h2 class="text-lg font-semibold">Live Preview</h2>

      {#if livePuzzle}
        <div class="rounded-xl border border-brand/30 p-3">
          <GameBoard puzzle={livePuzzle} />
        </div>
      {:else}
        <div class="rounded-xl border border-zinc-200 bg-zinc-100/70 p-3 sm:p-4 dark:border-zinc-800 dark:bg-black/40">
          <div class="rounded-lg sm:rounded-xl border border-zinc-200 p-2 sm:p-3 dark:border-zinc-800">
            <div class="mb-2 sm:mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {#each Array.from({ length: categoryCount * wordCount }) as _, idx}
                <div
                  class="flex h-12 sm:h-14 md:h-16 items-center justify-center rounded-lg sm:rounded-xl border border-zinc-200 bg-zinc-100 text-xs sm:text-sm text-zinc-700
                         dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  title={previewWords[idx] || `Word ${idx + 1}`}
                >
                  {previewWords[idx] || ''}
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Status -->
    {#if statusMsg}
      <div class={`rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 text-sm ring-1 bg-brand/10 text-zinc-900 ring-brand/40 dark:text-zinc-100`}>
        {statusMsg}
      </div>
    {/if}

    <!-- Actions: desktop/tablet -->
    <div class="hidden md:flex items-center justify-center gap-3 pt-4">
      <button
        type="button"
        on:click={clearAll}
        class="inline-flex items-center gap-2 rounded-full border border-brand/50 bg-transparent px-5 py-2.5 font-semibold text-brand
               hover:bg-brand/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >Clear</button>

      <button
        type="button"
        on:click={onSave}
        class="inline-flex items-center gap-2 rounded-full border border-brand/60 bg-brand/10 px-5 py-2.5 font-semibold text-brand
               hover:bg-brand/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
        disabled={saving}
      >
        <span class="inline-block h-3 w-3 rounded-full bg-brand"></span>
        {saving ? 'Saving…' : 'Save & Play'}
      </button>

      <button
        type="button"
        on:click={generateAll}
        class="inline-flex items-center gap-2 rounded-full border border-brand bg-brand px-5 py-2.5 font-semibold text-black
               hover:bg-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
        disabled={generating}
      >{generating ? 'Generating…' : 'Generate'}</button>
    </div>

    <div class="h-20 md:h-0"></div>
  </div>

  <!-- Sticky action bar: mobile only -->
  <div
    class="fixed md:hidden inset-x-0 bottom-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:dark:bg-zinc-900/70"
    style="padding-bottom: env(safe-area-inset-bottom);"
  >
    <div class="mx-auto max-w-6xl px-3 py-2">
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          on:click={clearAll}
          class="w-full rounded-full border border-brand/50 bg-transparent px-3 py-2 text-sm font-semibold text-brand
                 hover:bg-brand/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >Clear</button>
        <button
          type="button"
          on:click={onSave}
          class="w-full rounded-full border border-brand/60 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand
                 hover:bg-brand/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          disabled={saving}
        >{saving ? 'Saving…' : 'Save'}</button>
        <button
          type="button"
          on:click={generateAll}
          class="w-full rounded-full border border-brand bg-brand px-3 py-2 text-sm font-semibold text-black
                 hover:bg-brand/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
          disabled={generating}
        >{generating ? '…' : 'Generate'}</button>
      </div>
    </div>
  </div>
</div>
