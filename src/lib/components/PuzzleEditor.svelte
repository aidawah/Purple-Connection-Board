<script lang="ts">
  import GameBoard from "$lib/components/GameBoard.svelte";
  import ThemePicker from "$lib/components/ThemePicker.svelte";
  import PuzzleThemeProvider from "$lib/themes/PuzzleThemeProvider.svelte";
  import { browser } from "$app/environment";
  import { createEventDispatcher, onMount } from "svelte";
  import type { ThemeKey } from "$lib/themes/themes";

  // Props
  export let initial: {
    title?: string;
    size?: string; // like "4x4"
    categories?: Array<{ title: string; words: string[] }>;
    theme?: ThemeKey;
  } = {};
  export let draftKey: string | null = "pcg:create:draft"; // pass null to disable drafts
  export let submitLabel = "Save & Play";
  export let busy = false;             // let parent show loading on submit
  export let enableGenerate = true;    // reuse your /api/generate
  export let brand = "#14b8a6";

  const dispatch = createEventDispatcher();

  // --- theme & bounds
  const MIN = 4, MAX = 8;

  // --- state
  let puzzleId = "";
  let title = initial.title ?? "";
  let selectedTheme: ThemeKey | undefined = initial.theme;
  let categoryCount = Math.max(MIN, Math.min(MAX, initial.categories?.length ?? (parseInt(initial.size?.split("x")?.[0] || "4") || 4)));
  let wordCount = Math.max(MIN, Math.min(MAX, initial.categories?.[0]?.words?.length ?? (parseInt(initial.size?.split("x")?.[1] || "4") || 4)));
  type Cat = { name: string; words: string[] };
  let categories: Cat[] = (initial.categories ?? []).map(c => ({ name: c.title, words: [...(c.words ?? [])] }));

  // Ensure grid exists
  function clamp(n: number) { return Math.max(MIN, Math.min(MAX, Math.floor(n || MIN))); }
  function ensureGrid() {
    if (categories.length !== categoryCount) {
      const next = Array.from({ length: categoryCount }, (_, i) => categories[i] ?? { name: "", words: [] as string[] });
      next.forEach((c) => (c.words = Array.from({ length: wordCount }, (_, j) => c.words?.[j] ?? "")));
      categories = next;
    }
    if ((categories[0]?.words?.length ?? 0) !== wordCount) {
      categories = categories.map((c) => ({ ...c, words: Array.from({ length: wordCount }, (_, j) => c.words?.[j] ?? "") }));
    }
  }
  function resetGrid() {
    categories = Array.from({ length: categoryCount }, () => ({
      name: "",
      words: Array.from({ length: wordCount }, () => "")
    }));
  }

  // drafts
  const ls = {
    get(key: string) { if (!browser) return null; try { return localStorage.getItem(key); } catch { return null; } },
    set(key: string, v: string) { if (!browser) return; try { localStorage.setItem(key, v); } catch {} },
  };

  onMount(() => {
    if (!browser) return;
    const url = new URL(window.location.href);
    puzzleId = url.searchParams.get("id") ?? "";

    // hydrate from draft if enabled
    if (draftKey) {
      const raw = ls.get(draftKey);
      if (raw) {
        try {
          const d = JSON.parse(raw);
          title = d.title ?? title;
          selectedTheme = d.selectedTheme ?? selectedTheme;
          categoryCount = clamp(d.categoryCount ?? categoryCount);
          wordCount = clamp(d.wordCount ?? wordCount);
          categories = Array.isArray(d.categories) ? d.categories : categories;
        } catch {}
      }
    }
    if (categories.length === 0) resetGrid();
  });

  // keep grid in sync
  $: ensureGrid();

  // persist draft
  $: if (browser && draftKey) {
    ls.set(draftKey, JSON.stringify({ title, categoryCount, wordCount, categories, selectedTheme }));
  }

  // --- generation helpers
  type ApiCategory = { name: string; words: string[] };
  const nonEmpty = (arr: string[]) => arr.filter((w) => (w ?? "").trim().length > 0);
  function mergeWords(existing: string[], incoming: string[], targetLen: number) {
    const filled = [...existing];
    const seen = new Set(nonEmpty(existing).map((w) => w.toLowerCase()));
    let ptr = 0;
    for (let i = 0; i < targetLen; i++) {
      if ((filled[i] ?? "").trim()) continue;
      while (ptr < incoming.length) {
        const cand = (incoming[ptr++] ?? "").trim();
        if (cand && !seen.has(cand.toLowerCase())) { filled[i] = cand; seen.add(cand.toLowerCase()); break; }
      }
    }
    return filled.slice(0, targetLen).map((w) => w ?? "");
  }

  // generation actions (kept here so edit can also use them)
  let generating = false;
  let statusMsg = "";
  let statusType: "info" | "success" | "error" = "info";
  function status(msg: string, type: "info" | "success" | "error" = "info") {
    statusMsg = msg; statusType = type;
    setTimeout(() => { if (statusMsg === msg) statusMsg = ""; }, 2600);
  }

  async function generateCategories() {
    if (!enableGenerate) return;
    generating = true; status("Generating categories…", "info");
    try {
      const payload = {
        title, categoryCount, wordCount, mode: "all",
        categories: Array.from({ length: categoryCount }, (_, i) => ({
          name: categories[i]?.name || "", seedWords: [], need: wordCount
        }))
      };
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      const data: { title?: string; categories?: ApiCategory[] } = await res.json().catch(() => ({} as any));

      const names = (data.categories ?? []).map((c) => (c?.name ?? "").trim());
      categories = Array.from({ length: categoryCount }, (_, i) => ({
        name: names[i] || categories[i]?.name || `Category ${i + 1}`,
        words: categories[i]?.words ?? Array.from({ length: wordCount }, () => "")
      }));
      if ((data.title ?? "").trim()) title = data.title!.trim();
      status("Categories generated.", "success");
    } catch (e: any) {
      console.error(e); status(e?.message ?? "Failed to generate categories.", "error");
    } finally { generating = false; }
  }

  async function generateWords() {
    if (!enableGenerate) return;
    generating = true; status("Generating words…", "info");
    try {
      const missingIdx = categories.findIndex((c) => !c.name?.trim());
      if (missingIdx >= 0) throw new Error("Please name all categories first.");

      const inCats = categories.map((c) => {
        const filled = nonEmpty(c.words); const need = Math.max(0, wordCount - filled.length);
        return { name: c.name, seedWords: filled, need };
      });

      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ title, categoryCount, wordCount, mode: "missing", categories: inCats }) });
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      const data: { categories?: ApiCategory[] } = await res.json().catch(() => ({} as any));

      const byName = new Map<string, string[]>(); (data.categories ?? []).forEach((c) => byName.set((c?.name ?? "").trim(), Array.isArray(c?.words) ? c.words : []));
      categories = categories.map((c) => ({ ...c, words: mergeWords(c.words ?? [], byName.get(c.name.trim()) ?? [], wordCount) }));
      status("Words generated.", "success");
    } catch (e: any) {
      console.error(e); status(e?.message ?? "Failed to generate words.", "error");
    } finally { generating = false; }
  }

  // submit → let parent persist
  async function submit() {
    // minimal validation that mirrors your create flow
    if (!title.trim()) { status("Please enter a title.", "error"); return; }
    const anyEmpty = categories.some((c) => !c.name.trim() || c.words.some((w) => !w.trim()));
    if (anyEmpty) { status("Please complete all category names and every word box.", "error"); return; }

    const payload = {
      title: title.trim(),
      size: `${categoryCount}x${wordCount}`,
      categories: categories.map((c) => ({ title: c.name.trim(), words: c.words.map((w) => w.trim()) })),
      theme: selectedTheme
    };
    dispatch("submit", payload);
  }
</script>

<style>
</style>

<div class="w-full" style="--brand: {brand}">
  <div class="mx-auto max-w-7xl px-3 sm:px-6 py-6 grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">

    <!-- LEFT -->
    <section class="space-y-6">
      <div class="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800">
        <label class="text-sm font-medium text-zinc-700 dark:text-zinc-200" for="title">Puzzle title</label>
        <input id="title" class="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 mt-2" bind:value={title} placeholder="e.g. Hospital Departments" />
      </div>

      <!-- Theme selection -->
      <div class="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800">
        <ThemePicker bind:value={selectedTheme} showPreview={false} mode="puzzle" />
      </div>

      <!-- sliders -->
      <div class="rounded-2xl border border-zinc-200 bg-white/90 p-4 space-y-5 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800">
        <div>
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-zinc-700 dark:text-zinc-200" for="catRange">Categories</label>
            <span class="text-sm text-zinc-600 dark:text-zinc-300">{categoryCount}</span>
          </div>
          <input id="catRange" type="range" min={MIN} max={MAX} step="1" bind:value={categoryCount} on:change={() => (categoryCount = clamp(categoryCount))} class="w-full accent-[color:var(--brand)]" />
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-zinc-700 dark:text-zinc-200" for="wordRange">Words per category</label>
            <span class="text-sm text-zinc-600 dark:text-zinc-300">{wordCount}</span>
          </div>
          <input id="wordRange" type="range" min={MIN} max={MAX} step="1" bind:value={wordCount} on:change={() => (wordCount = clamp(wordCount))} class="w-full accent-[color:var(--brand)]" />
        </div>

        <div class="flex flex-wrap gap-3 pt-1">
          <button class="rounded-xl px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700" on:click={() => { resetGrid(); title=""; }}>Clear</button>
          {#if enableGenerate}
            <button class="rounded-xl px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700" on:click={generateCategories} disabled={generating}>Generate categories</button>
            <button class="rounded-xl px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700" on:click={generateWords} disabled={generating}>Generate words</button>
          {/if}
          <div class="flex-1"></div>
          <button class="rounded-xl px-4 py-2 text-white shadow-sm bg-[color:var(--brand)] hover:opacity-90 disabled:opacity-60" on:click={submit} disabled={busy || generating}>{busy ? "Saving…" : submitLabel}</button>
        </div>
      </div>

      <!-- grid -->
      <div class="rounded-2xl border border-zinc-200 bg-white/90 p-4 space-y-4 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800">
{#each categories as cat, ci}
  <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
    <div class="sm:col-span-2">
      <input
        id={`cat-${ci}`}
        class="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
        bind:value={cat.name}
        placeholder="Category {ci + 1}"
      />
    </div>

    <div class="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2 self-center">
      {#each cat.words as _, wi}
        <input
          class="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none focus:ring-2 focus:ring-[color:var(--brand)] dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
          bind:value={categories[ci].words[wi]}
          placeholder={`Word ${wi + 1}`}
        />
      {/each}
    </div>
  </div>
{/each}

      </div>

      {#if statusMsg}
        <div class="text-sm" class:text-blue-600={statusType === 'info'} class:text-green-600={statusType === 'success'} class:text-red-600={statusType === 'error'}>{statusMsg}</div>
      {/if}
    </section>

    <!-- RIGHT: preview -->
    <section class="space-y-3 xl:sticky xl:top-4 self-start">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Live preview</h2>
      <div class="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800">
        <PuzzleThemeProvider themeKey={selectedTheme}>
          <GameBoard
            puzzle={{
              id: "live",
              title: title || "Untitled",
              words: categories.flatMap((c, ci) =>
                c.words.map((w, wi) => ({ id: `${ci}-${wi}`, text: w || "", groupId: (["A","B","C","D","E","F","G","H"][ci] ?? "A") }))
              )
            } as any}
            {puzzleId}
            initialSeed={42}
            celebrateOnComplete={true}
            showControls={false}
          />
        </PuzzleThemeProvider>
      </div>
    </section>
  </div>
</div>
