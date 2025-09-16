<script lang="ts">
  import GameBoard from "$lib/components/GameBoard.svelte";
  import type { Puzzle } from "$lib/types";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import { collection, addDoc, serverTimestamp } from "firebase/firestore";

  // ---- Theme & bounds ----
  const BRAND = "#14b8a6";
  const MIN_COUNT = 4;
  const MAX_COUNT = 8;

  // ---- State ----
  let puzzleId = "";
  let title = "";
  let categoryCount = 4;
  let wordCount = 4;
  type Cat = { name: string; words: string[] };
  let categories: Cat[] = [];

  // ---- UI ----
  let generating = false;
  let saving = false;
  let statusMsg = "";
  let statusType: "info" | "success" | "error" = "info";
  let showPreview = true;

  // ---- Tailwind tokens ----
  const INPUT =
    "h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-[clamp(12px,1.05vw,16px)] leading-[1.2] text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-[color:var(--brand)] focus:border-[color:var(--brand)] dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700";
  const LABEL = "text-sm font-medium text-zinc-700 dark:text-zinc-200";
  const CARD =
    "rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur dark:bg-zinc-900/80 dark:border-zinc-800 shadow-sm";
  const BTN_SOLID =
    "rounded-xl px-4 py-2 text-white shadow-sm transition active:scale-[.98] bg-[color:var(--brand)] hover:opacity-90";
  const BTN_GHOST =
    "rounded-xl px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-sm transition active:scale-[.98] dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";
  const CAPTION = "text-xs text-zinc-500 dark:text-zinc-400";

  // ---- Local draft ----
  const ls = {
    get(key: string) { if (!browser) return null; try { return localStorage.getItem(key); } catch { return null; } },
    set(key: string, v: string) { if (!browser) return; try { localStorage.setItem(key, v); } catch {} },
  };
  const draftKey = () => "pcg:create:draft";

  onMount(() => {
    if (!browser) return;
    const url = new URL(window.location.href);
    puzzleId = url.searchParams.get("id") ?? "";

    const raw = ls.get(draftKey());
    if (raw) {
      try {
        const d = JSON.parse(raw);
        title = d.title ?? title;
        categoryCount = clamp(d.categoryCount ?? categoryCount);
        wordCount = clamp(d.wordCount ?? wordCount);
        categories = Array.isArray(d.categories) ? d.categories : categories;
      } catch {}
    }
    if (categories.length === 0) resetGrid();
  });

  $: { if (browser) ls.set(draftKey(), JSON.stringify({ title, categoryCount, wordCount, categories })); }

  // ---- Grid sync ----
  $: if (categories.length !== categoryCount) {
    const next = Array.from({ length: categoryCount }, (_, i) => categories[i] ?? { name: "", words: [] as string[] });
    next.forEach((c) => (c.words = Array.from({ length: wordCount }, (_, j) => c.words?.[j] ?? "")));
    categories = next;
  }
  $: if ((categories[0]?.words?.length ?? 0) !== wordCount) {
    categories = categories.map((c) => ({ ...c, words: Array.from({ length: wordCount }, (_, j) => c.words?.[j] ?? "") }));
  }

  function clamp(n: number) { return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(n || MIN_COUNT))); }
  function resetGrid() {
    categories = Array.from({ length: categoryCount }, () => ({
      name: "",
      words: Array.from({ length: wordCount }, () => "")
    }));
  }

  // ---- Helpers for generation ----
  type ApiCategory = { name: string; words: string[] };
  const nonEmptyWords = (arr: string[]) => arr.filter((w) => (w ?? "").trim().length > 0);

  function mergeWords(existing: string[], incoming: string[], targetLen: number) {
    const filled = [...existing];
    const existingSet = new Set(nonEmptyWords(existing).map((w) => w.toLowerCase()));
    let ptr = 0;
    for (let i = 0; i < targetLen; i++) {
      if ((filled[i] ?? "").trim()) continue;
      while (ptr < incoming.length) {
        const cand = (incoming[ptr++] ?? "").trim();
        if (cand && !existingSet.has(cand.toLowerCase())) {
          filled[i] = cand; existingSet.add(cand.toLowerCase()); break;
        }
      }
    }
    return filled.slice(0, targetLen).map((w) => w ?? "");
  }

  // ---- Generate: categories ----
  async function generateCategories() {
    generating = true; status("Generating categories…", "info");
    try {
      const payload = {
        title,
        categoryCount,
        wordCount,
        mode: "all",
        categories: Array.from({ length: categoryCount }, (_, i) => ({
          name: categories[i]?.name || "",
          seedWords: [],
          need: wordCount
        }))
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // credentials not required for same-origin, but won’t hurt:
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });

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
      console.error("generateCategories error:", e);
      status(e?.message ?? "Failed to generate categories.", "error");
    } finally {
      generating = false;
    }
  }

  // ---- Generate: words ----
  async function generateWords() {
    generating = true; status("Generating words…", "info");
    try {
      const missingIdx = categories.findIndex((c) => !c.name?.trim());
      if (missingIdx >= 0) throw new Error("Please name all categories first.");

      const inCats = categories.map((c) => {
        const filled = nonEmptyWords(c.words);
        const need = Math.max(0, wordCount - filled.length);
        return { name: c.name, seedWords: filled, need };
      });

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title, categoryCount, wordCount, mode: "missing", categories: inCats })
      });
      if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
      const data: { categories?: ApiCategory[] } = await res.json().catch(() => ({} as any));

      const byName = new Map<string, string[]>();
      (data.categories ?? []).forEach((c) => byName.set((c?.name ?? "").trim(), Array.isArray(c?.words) ? c.words : []));

      categories = categories.map((c) => {
        const incoming = byName.get(c.name.trim()) ?? [];
        return { ...c, words: mergeWords(c.words ?? [], incoming, wordCount) };
      });

      status("Words generated.", "success");
    } catch (e: any) {
      console.error("generateWords error:", e);
      status(e?.message ?? "Failed to generate words.", "error");
    } finally {
      generating = false;
    }
  }

  // ---- Save & Play ----
  async function saveAndPlay() {
    saving = true; status("Saving…", "info");
    try {
      if (!browser) throw new Error("Cannot save during SSR");

      // Keep validation minimal so it doesn't block generation buttons:
      if (!title.trim()) throw new Error("Please enter a title.");
      const anyEmpty = categories.some((c) => !c.name.trim() || c.words.some((w) => !w.trim()));
      if (anyEmpty) throw new Error("Please complete all category names and every word box.");

      // Lazy-import firebase app to avoid SSR/window issues
      const fb = await import("$lib/firebase");
      const { db, auth } = fb as any;

      const uid = auth?.currentUser?.uid ?? null;

      const payload = {
        title: title.trim(),
        categories: categories.map((c) => ({
          title: c.name.trim(),
          words: c.words.map((w) => w.trim())
        })),
        size: `${categoryCount}x${wordCount}`,
        createdAt: serverTimestamp(),
        author: uid ? {
          uid,
          name: auth.currentUser.displayName ?? "",
          email: auth.currentUser.email ?? "",
          photoURL: auth.currentUser.photoURL ?? ""
        } : null
      };

      const ref = await addDoc(collection(db, "puzzles"), payload);

      status("Saved! Opening game…", "success");
      await goto(`/${ref.id}`); // make sure /play/[id] exists and reads this doc
    } catch (e: any) {
      console.error("saveAndPlay error:", e);
      status(e?.message ?? "Failed to save.", "error");
    } finally {
      saving = false;
    }
  }

  function clearAll() { resetGrid(); title = ""; status("Cleared.", "success"); }

  function status(msg: string, type: "info" | "success" | "error" = "info") {
    statusMsg = msg; statusType = type;
    setTimeout(() => { if (statusMsg === msg) statusMsg = ""; }, 2600);
  }
</script>

<!-- Layout -->
<div class="w-full" style="--brand:{BRAND}">
  <div class="mx-auto max-w-7xl px-3 sm:px-6 py-6 grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">

    <!-- LEFT: Controls & form -->
    <section class="space-y-6">
      <!-- Title -->
      <div class={CARD + " p-4"}>
        <label class={LABEL} for="title">Puzzle title</label>
        <input id="title" class={INPUT + " mt-2"} bind:value={title} placeholder="e.g. Hospital Departments" />
        <p class={CAPTION + " mt-2"}>Tip: Short, specific titles look best in the preview.</p>
      </div>

      <!-- Sliders -->
      <div class={CARD + " p-4 space-y-5"}>
        <div>
          <div class="flex items-center justify-between">
            <label class={LABEL} for="catRange">Categories</label>
            <span class="text-sm text-zinc-600 dark:text-zinc-300">{categoryCount}</span>
          </div>
          <input
            id="catRange"
            type="range" min={MIN_COUNT} max={MAX_COUNT} step="1"
            bind:value={categoryCount}
            class="w-full accent-[color:var(--brand)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4"
            on:change={() => (categoryCount = clamp(categoryCount))}
            aria-label="Set number of categories"
          />
          <div class="flex justify-between mt-1">
            <span class={CAPTION}>{MIN_COUNT}</span><span class={CAPTION}>{MAX_COUNT}</span>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label class={LABEL} for="wordRange">Words per category</label>
            <span class="text-sm text-zinc-600 dark:text-zinc-300">{wordCount}</span>
          </div>
          <input
            id="wordRange"
            type="range" min={MIN_COUNT} max={MAX_COUNT} step="1"
            bind:value={wordCount}
            class="w-full accent-[color:var(--brand)] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4"
            on:change={() => (wordCount = clamp(wordCount))}
            aria-label="Set number of words per category"
          />
          <div class="flex justify-between mt-1">
            <span class={CAPTION}>{MIN_COUNT}</span><span class={CAPTION}>{MAX_COUNT}</span>
          </div>
        </div>

        <!-- Primary actions -->
        <div class="flex flex-wrap gap-3 pt-1">
          <button class={BTN_GHOST} on:click={clearAll}>Clear</button>
          <button class={BTN_GHOST} on:click={generateCategories} disabled={generating}>Generate categories</button>
          <button class={BTN_GHOST} on:click={generateWords} disabled={generating}>Generate words</button>
          <div class="flex-1"></div>
          <button class={BTN_SOLID} on:click={saveAndPlay} disabled={saving || generating}>
            {saving ? "Saving…" : "Save & Play"}
          </button>
        </div>
      </div>

      <!-- Categories & words grid -->
      <div class={CARD + " p-4 space-y-4"}>
        {#each categories as cat, ci}
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 items-start">
            <div class="sm:col-span-2">
              <label class={LABEL} for={`cat-${ci}`}>Category {ci + 1}</label>
              <input id={`cat-${ci}`} class={INPUT + " mt-2"} bind:value={cat.name} placeholder="Name" />
            </div>
            <div class="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {#each cat.words as _, wi}
                <input class={INPUT + " h-10"} bind:value={categories[ci].words[wi]} placeholder={`Word ${wi + 1}`} />
              {/each}
            </div>
          </div>
        {/each}
      </div>

      {#if statusMsg}
        <div class="text-sm"
          class:text-blue-600={statusType === 'info'}
          class:text-green-600={statusType === 'success'}
          class:text-red-600={statusType === 'error'}>
          {statusMsg}
        </div>
      {/if}
    </section>

    <!-- RIGHT: Live preview (sticky on xl+) -->
    <section class="space-y-3 xl:sticky xl:top-4 self-start">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Live preview</h2>
        <div class="flex items-center gap-2">
          <button class={BTN_GHOST} on:click={() => (showPreview = !showPreview)}>
            {showPreview ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {#if showPreview}
        <div class={CARD + " p-4"}>
          <GameBoard
            puzzle={{
              id: "live",
              title: title || "Untitled",
              words: categories.flatMap((c, ci) =>
                c.words.map((w, wi) => ({ id: `${ci}-${wi}`, text: w || "", groupId: (["A", "B", "C", "D"][ci] ?? "A") }))
              )
            } as any}
            {puzzleId}
            initialSeed={42}
            celebrateOnComplete={true}
            showControls={false}
            on:complete={() => console.log("Preview complete")}
          />
          <!-- no buttons in preview -->
        </div>
      {/if}
    </section>

  </div>
</div>
