<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';

  // URL param
  let puzzleId = '';

  // Form state
  let title = '';
  let categoryCount = 4;
  let wordCount = 4;
  type Cat = { name: string; words: string[] };
  let categories: Cat[] = [];

  // Derived for preview (and parity with your snippet)
  $: previewWords = categories.flatMap((c) => c.words);
  $: previewGroups = (() => {
    const groups: number[][] = [];
    let offset = 0;
    for (const c of categories) {
      groups.push(c.words.map((_, i) => offset + i));
      offset += c.words.length;
    }
    return groups;
  })();

  // Status (placeholder)
  let saving = false;
  let statusMsg = '';
  let statusType: 'info' | 'success' | 'error' = 'info';

  // Debug toggle (hidden by default)
  let showDebug = false;

  // Mock debug data content
  $: debug = {
    'Selected Words': [],
    'Selected grid indices': [],
    'Selected grid states': [],
    Order:
      '[] - orig: [] (0-3,4-7,8-11,12-15) – ' +
      'flags: ' +
      JSON.stringify(Array(16).fill(false)),
    SolvedGroup: JSON.stringify(Array(categoryCount).fill(false)),
    SolvedGroup2: JSON.stringify(Array(4).fill(false))
  };

  // Local draft per puzzle id
  const draftKey = () => `create_draft_${puzzleId}`;

  function initCategories() {
    categories = Array.from({ length: categoryCount }, () => ({
      name: '',
      words: Array.from({ length: wordCount }, () => '')
    }));
  }

  onMount(() => {
    puzzleId = get(page).params.id ?? '';
    // try load draft
    const raw = localStorage.getItem(draftKey());
    if (raw) {
      try {
        const d = JSON.parse(raw);
        title = d.title ?? '';
        categoryCount = d.categoryCount ?? 4;
        wordCount = d.wordCount ?? 4;
        categories = Array.isArray(d.categories) ? d.categories : [];
      } catch {
        // ignore parsing issues
      }
    }
    if (categories.length === 0) initCategories();
  });

  // Debounced draft save
  let t: any;
  function saveDraftSoon() {
    clearTimeout(t);
    t = setTimeout(() => {
      localStorage.setItem(
        draftKey(),
        JSON.stringify({ title, categoryCount, wordCount, categories })
      );
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
    saveDraftSoon();
  }
  $: {
    categories = categories.map((cat) => ({
      name: cat.name,
      words: [
        ...cat.words.slice(0, wordCount),
        ...Array(Math.max(0, wordCount - cat.words.length)).fill('')
      ]
    }));
    saveDraftSoon();
  }

  // Placeholder save
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
</script>

<!-- PAGE -->
<div class="min-h-screen bg-[#0B0F12]">
  <div class="max-w-6xl mx-auto px-4 py-8 space-y-8">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[#F1FFFD]">Create Puzzle</h1>
      <span class="text-xs text-white/50">ID: {puzzleId}</span>
    </div>

    <!-- Title -->
    <div>
      <label for="title" class="block mb-1 text-sm text-[#F1FFFD]/80">Title</label>
      <input
        id="title"
        type="text"
        bind:value={title}
        on:input={saveDraftSoon}
        placeholder="e.g., Animals & Colors"
        class="w-full px-3 py-2.5 rounded-xl bg-[#12181D] border border-white/10 text-[#F1FFFD]
               placeholder-[#F1FFFD]/40 focus:outline-none focus:ring-2 focus:ring-[#2EE8C2]/60"
      />
    </div>

    <!-- Sliders -->
    <div class="grid sm:grid-cols-2 gap-6">
      <div>
        <label for="categoryCount" class="block mb-2 text-sm text-[#F1FFFD]/80">
          Categories: <span class="font-semibold text-[#F1FFFD]">{categoryCount}</span>
        </label>
        <input id="categoryCount" type="range" min="2" max="8" bind:value={categoryCount} class="w-full accent-[#2EE8C2]" />
        <p class="mt-1 text-xs text-[#F1FFFD]/60">How many groups your puzzle will have.</p>
      </div>
      <div>
        <label for="wordCount" class="block mb-2 text-sm text-[#F1FFFD]/80">
          Words each: <span class="font-semibold text-[#F1FFFD]">{wordCount}</span>
        </label>
        <input id="wordCount" type="range" min="2" max="8" bind:value={wordCount} class="w-full accent-[#2EE8C2]" />
        <p class="mt-1 text-xs text-[#F1FFFD]/60">How many words go into each category.</p>
      </div>
    </div>

    <!-- Categories list -->
    <div class="space-y-4">
      {#each categories as cat, i}
        <div class="rounded-2xl bg-[#0F1419] border border-white/10 p-4">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="sm:col-span-1">
              <label for={"cat-" + i} class="block text-xs mb-1 text-[#F1FFFD]/70">Category {i + 1}</label>
              <input
                id={"cat-" + i}
                type="text"
                bind:value={cat.name}
                on:input={saveDraftSoon}
                placeholder="Category name"
                class="w-full px-3 py-2 rounded-lg bg-[#12181D] border border-white/10 text-[#F1FFFD]
                       placeholder-[#F1FFFD]/40 focus:outline-none focus:ring-2 focus:ring-[#2EE8C2]/60"
              />
            </div>
            <div class="sm:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              {#each cat.words as _, j}
                <input
                  id={`w-${i}-${j}`}
                  type="text"
                  bind:value={categories[i].words[j]}
                  on:input={saveDraftSoon}
                  placeholder={`Word ${j + 1}`}
                  class="px-3 py-2 rounded-lg bg-[#12181D] border border-white/10 text-[#F1FFFD]
                         placeholder-[#F1FFFD]/40 focus:outline-none focus:ring-2 focus:ring-[#2EE8C2]/60"
                />
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Live Preview -->
    <div class="rounded-2xl bg-[#0F1419] border border-white/10 p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold text-[#F1FFFD]">Live Preview</h2>
        <div class="flex items-center gap-3">
          <span class="text-xs text-[#F1FFFD]/60">Updates as you type</span>
          <!-- quick toggle (optional) -->
          <label class="inline-flex items-center gap-2 text-xs text-[#F1FFFD]/70 cursor-pointer select-none">
            <input type="checkbox" bind:checked={showDebug} class="accent-[#2EE8C2]" />
            Debug
          </label>
        </div>
      </div>

      <div class="rounded-2xl bg-[#0B0F12]/50 border border-white/10 p-4">
        <div class="rounded-xl border border-white/10 p-3">
          <!-- Grid -->
          <div class="grid grid-cols-4 gap-3 mb-3">
            {#each Array.from({ length: categoryCount * wordCount }) as _, idx}
              <div
                class="h-16 rounded-xl bg-[#0B0F12] border border-white/10 flex items-center justify-center
                       text-[#F1FFFD]/90 text-sm"
                title={previewWords[idx] || `Word ${idx + 1}`}
              >
                {previewWords[idx] || ''}
              </div>
            {/each}
          </div>

          <!-- Debug (togglable) -->
          {#if showDebug}
            <div class="rounded-lg bg-black/40 border border-white/10 p-3">
              <pre class="text-xs leading-relaxed text-[#F1FFFD]/80 overflow-auto">
Selected Words: {JSON.stringify(debug['Selected Words'])}
Selected grid indices: {JSON.stringify(debug['Selected grid indices'])}
Selected grid states: {JSON.stringify(debug['Selected grid states'])}

Order: {debug.Order}
SolvedGroup: {debug.SolvedGroup}
SolvedGroup2: {debug.SolvedGroup2}
              </pre>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Status -->
    {#if statusMsg}
      <div
        class={`px-4 py-2 rounded-xl text-sm ring-1
          ${
            statusType === 'info'
              ? 'bg-[#0ea5a3]/20 text-[#F1FFFD] ring-[#2EE8C2]/40'
              : statusType === 'success'
              ? 'bg-emerald-600/20 text-[#F1FFFD] ring-emerald-400/40'
              : 'bg-rose-600/20 text-[#F1FFFD] ring-rose-400/40'
          }`}
      >
        {statusMsg}
      </div>
    {/if}

    <!-- Centered action -->
    <div class="flex items-center justify-center pt-2">
      <button
        on:click={onSave}
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
               bg-[#0a2f2b] text-[#F1FFFD] font-semibold ring-1 ring-[#2EE8C2]/40
               hover:bg-[#0c3a35] focus:outline-none focus-visible:ring-2
               focus-visible:ring-[#2EE8C2]/60 disabled:opacity-50"
        disabled={saving}
      >
        <span class="inline-block w-3 h-3 rounded-full bg-[#2EE8C2]"></span>
        {saving ? 'Saving…' : 'Save & Play'}
      </button>
    </div>
  </div>
</div>
