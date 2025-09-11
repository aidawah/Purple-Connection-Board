<script lang="ts">
  import GameBoard from '$lib/components/GameBoard.svelte';
  import type { Puzzle } from '$lib/types';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';

  // ---- Theme ----
  const BRAND = '#14b8a6';

  // ---- Slider bounds ----
  const MIN_COUNT = 4;
  const MAX_COUNT = 8;

  // ---- URL / state ----
  let puzzleId = '';
  let title = '';
  let categoryCount = 4;
  let wordCount = 4;
  type Cat = { name: string; words: string[] };
  let categories: Cat[] = [];

  // ---- UI state ----
  let generating = false;
  let saving = false;
  let statusMsg = '';
  let statusType: 'info' | 'success' | 'error' = 'info';

  // ---- Styles ----
  const INPUT =
    'h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[clamp(12px,1.1vw,16px)] leading-[1.2] ' +
    'text-zinc-900 placeholder-zinc-500 outline-none ' +
    'focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent ' +
    'dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400';

  const TITLE_INPUT =
    'h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[clamp(12px,1.3vw,18px)] leading-[1.25] ' +
    'text-zinc-900 placeholder-zinc-500 outline-none ' +
    'focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent ' +
    'dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400';

  const CARD =
    'rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900';

  // ---- Local storage (SSR safe) ----
  const ls = {
    get(k: string) { if (!browser) return null; try { return localStorage.getItem(k); } catch { return null; } },
    set(k: string, v: string) { if (!browser) return; try { localStorage.setItem(k, v); } catch {} }
  };
  const draftKey = () => `create_draft_${puzzleId || 'new'}`;

  function initCategories() {
    categories = Array.from({ length: categoryCount }, () => ({
      name: '',
      words: Array.from({ length: wordCount }, () => '')
    }));
  }

  function clampCounts() {
    categoryCount = Math.min(MAX_COUNT, Math.max(MIN_COUNT, categoryCount));
    wordCount = Math.min(MAX_COUNT, Math.max(MIN_COUNT, wordCount));
  }

  onMount(() => {
    document.documentElement.style.setProperty('--brand', BRAND);

    puzzleId = get(page).params.id ?? '';
    const raw = ls.get(draftKey());
    if (raw) {
      try {
        const d = JSON.parse(raw);
        title = d.title ?? '';
        categoryCount = d.categoryCount ?? 4;
        wordCount = d.wordCount ?? 4;
        clampCounts();
        categories = Array.isArray(d.categories) ? d.categories : [];
      } catch {}
    }
    if (categories.length === 0) initCategories();
  });

  // ---- Firestore Save ----
  async function onSave() {
    statusMsg = '';
    if (!title.trim()) { statusMsg = 'Title is required'; statusType = 'error'; return; }
    for (let i = 0; i < categories.length; i++) {
      if (!categories[i].name.trim()) { statusMsg = `Category #${i + 1} needs a name`; statusType = 'error'; return; }
      for (let j = 0; j < categories[i].words.length; j++) {
        if (!categories[i].words[j].trim()) {
          statusMsg = `Word #${j + 1} in “${categories[i].name || `Category ${i + 1}`}” is empty`;
          statusType = 'error'; return;
        }
      }
    }

    try {
      saving = true;
      statusMsg = 'Saving to Firestore…';
      statusType = 'info';

      const { auth, upsertPuzzle } = await import('$lib/firebase');
      if (!auth.currentUser) {
        saving = false;
        statusMsg = 'Please sign in to save your puzzle.';
        statusType = 'error';
        return;
      }

      const payload = { title: title.trim(), categories, wordCount, categoryCount };
      const newId = await upsertPuzzle(puzzleId || undefined, payload);
      if (!puzzleId) puzzleId = newId;

      ls.set(draftKey(), JSON.stringify({ title, categoryCount, wordCount, categories }));

      statusMsg = 'Saved successfully!';
      statusType = 'success';
      saving = false;
    } catch (err: any) {
      console.error(err);
      statusMsg = err?.message || 'Failed to save. Please try again.';
      statusType = 'error';
      saving = false;
    }
  }

  // ---- Debounced draft ----
  let t: any;
  function saveDraftSoon() {
    if (!browser) return;
    clearTimeout(t);
    t = setTimeout(() => {
      ls.set(draftKey(), JSON.stringify({ title, categoryCount, wordCount, categories }));
    }, 150);
  }

  // ---- Keep arrays in sync with sliders ----
  $: clampCounts();

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

  // ======================
  // ChatGPT Generation API
  // ======================
  function missingCount(words: string[]) {
    return Math.max(0, wordCount - (words?.filter(Boolean).length ?? 0));
  }

  async function postGenerate(payload: any) {
    const res = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error((await res.json())?.error || 'Generation failed');
    return res.json();
  }

  // Generate/Regenerate CATEGORY NAMES only (keep words as-is)
  async function generateCategories() {
    generating = true; statusMsg='Generating categories…'; statusType='info';
    try {
      const { categories: outCats } = await postGenerate({
        mode: 'all', title, categoryCount, wordCount
      });
      categories = categories.map((c, i) => ({
        name: String(outCats?.[i]?.name ?? c.name ?? `Category ${i+1}`),
        words: c.words // keep existing words intact
      }));
      statusMsg='Categories updated.'; statusType='success';
      saveDraftSoon();
    } catch (e: any) {
      statusMsg = e?.message || 'Failed to generate categories.'; statusType='error';
    } finally { generating = false; }
  }

  // Generate words initially, then regenerate ALL words on subsequent clicks (keep names)
  async function generateWords() {
    generating = true; statusMsg='Generating words…'; statusType='info';
    try {
      const anyWords = categories.some(c => c.words.some(w => w.trim().length > 0));
      const shaped = categories.map((c) => ({
        name: c.name || 'Untitled',
        seedWords: anyWords ? [] : (c.words || []).filter(Boolean).slice(0, wordCount),
        need: anyWords ? wordCount : missingCount(c.words)
      }));

      const { categories: outCats } = await postGenerate({
        mode: 'missing', title, categoryCount, wordCount, categories: shaped
      });

      categories = categories.map((c, i) => {
        const gen = outCats?.[i];
        const nextWords = (gen?.words || []).slice(0, wordCount);
        // if initial fill, fill blank slots; if regen, replace all words
        if (!anyWords) {
          const filled = [...c.words];
          let k = 0;
          for (let j = 0; j < filled.length && k < nextWords.length; j++) {
            if (!filled[j] || !filled[j].trim()) filled[j] = nextWords[k++];
          }
          return { name: c.name, words: filled };
        }
        return { name: c.name, words: nextWords };
      });

      statusMsg = anyWords ? 'Words regenerated.' : 'Words generated.';
      statusType='success';
      saveDraftSoon();
    } catch (e: any) {
      statusMsg = e?.message || 'Failed to generate words.'; statusType='error';
    } finally { generating = false; }
  }

  // ---- Clear ----
  function onClear() {
    title = '';
    categories = Array.from({ length: categoryCount }, () => ({
      name: '',
      words: Array.from({ length: wordCount }, () => '')
    }));
    ls.set(draftKey(), JSON.stringify({ title, categoryCount, wordCount, categories }));
    statusMsg = 'All categories and words cleared.'; statusType = 'info';
  }

  // ---- Live Preview puzzle (4×4) ----
  const GROUP_IDS = ['A','B','C','D'] as const;
  function makeId(i:number,j:number,text:string){
    return `${i}-${j}-${(text||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
  }
  $: livePuzzle = (() => {
    if (categoryCount !== 4 || wordCount !== 4) return null;
    const all = categories.flatMap(c => c.words);
    if (all.filter(Boolean).length !== 16) return null;
    const words = categories.flatMap((c, i) =>
      c.words.map((w, j) => ({ id: makeId(i, j, w), text: (w ?? '').trim(), groupId: GROUP_IDS[i] }))
    );
    return { id: `live-${puzzleId || 'draft'}`, title: title?.trim() || 'Untitled Puzzle', words } as Puzzle;
  })();

  // ---- Dynamic labels ----
  $: hasAnyCategoryName = categories.some(c => c.name.trim().length > 0);
  $: hasAnyWord = categories.some(c => c.words.some(w => w.trim().length > 0));
  $: catsBtnLabel = hasAnyCategoryName ? 'Regenerate Categories' : 'Generate Categories';
  $: wordsBtnLabel = hasAnyWord ? 'Regenerate Words' : 'Generate Words';

  // ---- Slider progress percentages (for colored fill) ----
  $: catPct  = Math.round(((categoryCount - MIN_COUNT) / (MAX_COUNT - MIN_COUNT)) * 100);
  $: wordPct = Math.round(((wordCount    - MIN_COUNT) / (MAX_COUNT - MIN_COUNT)) * 100);
</script>

<style>
  :root { --brand: #14b8a6; --slider-track-h: 8px; --slider-thumb: 22px; }
  .hs-slider { -webkit-appearance: none; appearance: none; width: 100%; background: transparent; padding-block: 10px; cursor: pointer; touch-action: pan-y; -webkit-tap-highlight-color: transparent; }
  .hs-slider::-webkit-slider-runnable-track { height: var(--slider-track-h); border-radius: 9999px; background: linear-gradient(to right, color-mix(in oklab, var(--brand) 92%, white) 0 var(--p), transparent var(--p) 100%), white; border: 1px solid rgb(212 212 216); }
  @media (prefers-color-scheme: dark) { .hs-slider::-webkit-slider-runnable-track { background: linear-gradient(to right, color-mix(in oklab, var(--brand) 85%, black) 0 var(--p), transparent var(--p) 100%), rgb(24 24 27); border-color: rgb(82 82 91); } }
  .hs-slider::-webkit-slider-thumb { -webkit-appearance: none; width: var(--slider-thumb); height: var(--slider-thumb); border-radius: 9999px; background: var(--brand); border: 2px solid white; margin-top: calc((var(--slider-track-h) - var(--slider-thumb)) / 2); box-shadow: 0 1px 2px rgb(0 0 0 / 25%); transition: transform .08s ease, box-shadow .12s ease; }
  @media (prefers-color-scheme: dark) { .hs-slider::-webkit-slider-thumb { border-color: rgb(24 24 27); } }
  .hs-slider:hover::-webkit-slider-thumb { box-shadow: 0 2px 6px rgb(0 0 0 / 30%); }
  .hs-slider:active::-webkit-slider-thumb { transform: scale(1.05); }
  .hs-slider::-moz-range-track { height: var(--slider-track-h); border-radius: 9999px; background: linear-gradient(to right, color-mix(in oklab, var(--brand) 92%, white) 0 var(--p), transparent var(--p) 100%), white; border: 1px solid rgb(212 212 216); }
  @media (prefers-color-scheme: dark) { .hs-slider::-moz-range-track { background: linear-gradient(to right, color-mix(in oklab, var(--brand) 85%, black) 0 var(--p), transparent var(--p) 100%), rgb(24 24 27); border-color: rgb(82 82 91); } }
  .hs-slider::-moz-range-thumb { width: var(--slider-thumb); height: var(--slider-thumb); border-radius: 9999px; background: var(--brand); border: 2px solid white; box-shadow: 0 1px 2px rgb(0 0 0 / 25%); transition: transform .08s ease, box-shadow .12s ease; }
  @media (prefers-color-scheme: dark) { .hs-slider::-moz-range-thumb { border-color: rgb(24 24 27); } }
  .hs-slider:hover::-moz-range-thumb { box-shadow: 0 2px 6px rgb(0 0 0 / 30%); }
  .hs-slider:active::-moz-range-thumb { transform: scale(1.05); }
  .hs-slider:focus { outline: none; }
  .hs-slider:focus::-webkit-slider-runnable-track, .hs-slider:focus::-moz-range-track { box-shadow: 0 0 0 2px color-mix(in oklab, var(--brand) 50%, transparent); }
</style>

<div class="min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-100">
  <div class="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 md:pt-10 md:pb-12">
    <div class="mb-6 md:mb-8 flex items-center justify-between">
      <h1 class="text-2xl md:text-3xl font-semibold tracking-tight">Create Puzzle</h1>
      <span class="hidden sm:inline text-xs text-zinc-500 dark:text-zinc-400">ID: <span class="font-medium text-[color:var(--brand)]">{puzzleId}</span></span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div class="space-y-6">
        <div class={CARD}>
          <div class="grid gap-6 sm:grid-cols-2">
            <div class="flex flex-col">
              <div class="mb-1.5 flex items-center justify-between">
                <label for="categoryCount" class="text-sm font-medium text-zinc-800 dark:text-zinc-200">Categories</label>
                <span class="ml-2 rounded-md bg-[color:var(--brand)] px-2 py-0.5 text-xs font-semibold text-white">{categoryCount}</span>
              </div>
              <input id="categoryCount" type="range" min={MIN_COUNT} max={MAX_COUNT} step="1" bind:value={categoryCount} class="hs-slider" style={`--p:${catPct}%`} aria-describedby="cats-help" />
              <p id="cats-help" class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Number of groups (min {MIN_COUNT}).</p>
            </div>

            <div class="flex flex-col">
              <div class="mb-1.5 flex items-center justify-between">
                <label for="wordCount" class="text-sm font-medium text-zinc-800 dark:text-zinc-200">Words each</label>
                <span class="ml-2 rounded-md bg-[color:var(--brand)] px-2 py-0.5 text-xs font-semibold text-white">{wordCount}</span>
              </div>
              <input id="wordCount" type="range" min={MIN_COUNT} max={MAX_COUNT} step="1" bind:value={wordCount} class="hs-slider" style={`--p:${wordPct}%`} aria-describedby="words-help" />
              <p id="words-help" class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Words per category (min {MIN_COUNT}).</p>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap items-center gap-2">
            {#each [
              { id: 'cats',  label: catsBtnLabel,                           click: generateCategories, disabled: generating },
              { id: 'words', label: wordsBtnLabel,                          click: generateWords,      disabled: generating },
              { id: 'save',  label: saving ? 'Saving…' : 'Save & Play',     click: onSave,             disabled: saving },
              { id: 'clear', label: 'Clear',                                click: onClear,            disabled: false }
            ] as btn}
              <button
                type="button"
                on:click={btn.click}
                disabled={btn.disabled}
                class="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold
                       bg-[color:var(--brand)] text-white shadow-sm hover:brightness-95
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/60
                       disabled:opacity-60">
                {btn.label}
              </button>
            {/each}
          </div>
        </div>

        <div class={CARD}>
          <label for="title" class="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Puzzle title</label>
          <div class="flex items-center gap-2">
            <input id="title" type="text" bind:value={title} on:input={saveDraftSoon} placeholder="Short & sweet" class={TITLE_INPUT} />
            <span class="hidden sm:inline text-[11px] text-zinc-500 dark:text-zinc-400">ID: <span class="font-medium text-[color:var(--brand)]">{puzzleId}</span></span>
          </div>
        </div>

        <div class="space-y-4">
          {#each categories as cat, i}
            <div class={CARD}>
              <div class="grid gap-3 sm:grid-cols-4">
                <!-- No top 'Category 1/2/3' title; just the input -->
                <div class="sm:col-span-1">
                  <input
                    id={'cat-' + i}
                    type="text"
                    bind:value={cat.name}
                    on:input={saveDraftSoon}
                    placeholder="Category name"
                    class={INPUT}
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
                      class={INPUT}
                    />
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        </div>

        {#if statusMsg}
          <div class="rounded-xl border p-4 shadow-sm border-[color:var(--brand)]/30 bg-[color:var(--brand)]/10">
            <div class="text-sm">{statusMsg}</div>
          </div>
        {/if}

        <div class="h-28 lg:h-0"></div>
      </div>

      <div class="lg:pl-2">
        <div class="sticky top-6 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Live Preview</h2>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">ID: <span class="font-medium text-[color:var(--brand)]">{puzzleId}</span></span>
          </div>

          <div class={CARD}>
            {#if livePuzzle}
              <div class="rounded-xl border border-[color:var(--brand)]/30 p-3 bg-white dark:bg-zinc-950">
                <GameBoard puzzle={livePuzzle} />
              </div>
            {:else}
              <div class="rounded-xl border border-zinc-200 p-2 sm:p-3 dark:border-zinc-800">
                <div class="mb-2 sm:mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {#each Array.from({ length: categoryCount * wordCount }) as _}
                    <div class="flex h-12 sm:h-14 md:h-16 items-center justify-center rounded-lg sm:rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"></div>
                  {/each}
                </div>
              </div>
              <p class="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">Preview appears once the 4×4 grid is complete.</p>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Sticky action bar: mobile only -->
  <div
    class="fixed md:hidden inset-x-0 bottom-0 z-40 border-t border-zinc-200 dark:border-zinc-800
           bg-white/95 dark:bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:dark:bg-zinc-900/70"
    style="padding-bottom: env(safe-area-inset-bottom);"
  >
    <div class="mx-auto max-w-7xl px-3 py-2">
      <div class="grid grid-cols-4 gap-2">
        {#each [
          { label: catsBtnLabel, click: generateCategories, disabled: generating },
          { label: wordsBtnLabel, click: generateWords, disabled: generating },
          { label: 'Save', click: onSave, disabled: saving },
          { label: 'Clear', click: onClear, disabled: false }
        ] as m}
          <button
            type="button"
            on:click={m.click}
            disabled={m.disabled}
            class="w-full rounded-full px-3 py-2 text-sm font-semibold
                   bg-[color:var(--brand)] text-white shadow-sm hover:brightness-95
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]/60
                   disabled:opacity-60">
            {m.label}
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>
