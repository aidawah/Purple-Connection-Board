<script lang="ts">
  import { onMount, tick, createEventDispatcher } from "svelte";
  import type { Puzzle as DataPuzzle } from "$lib/data/puzzles";
  import type { Puzzle } from "$lib/types";
  import { shuffled } from "$lib/gameLogic"; // ← no groupName import
  import PuzzleCard from "$lib/components/PuzzleCard.svelte";
  import CompletionRing from "$lib/effects/CompletionRing.svelte";

  // ── Props ────────────────────────────────────────────────────────────────────
  /** Optional puzzle id for analytics/events */
  export let puzzleId: string | number | null = null;
  /** Accepts either engine-shape Puzzle or datastore shape and adapts */
  export let puzzle: Puzzle | null = null;
  /** Initial shuffle seed */
  export let initialSeed: number = 42;

  /** Old-board resume support (merged from OldGameBoard.svelte).
   *  If provided, we resume grid order / selections while still using the new visuals.
   */
  export let resumeState:
    | {
        order?: number[];
        solvedByOrig?: boolean[];
        selectedOrig?: number[];
        selectedSi?: number[];
        selectedWords?: string[];
      }
    | null = null;

  /** UI switches (from old board), still respected here */
  export let showControls: boolean = true; // toolbars/buttons visible
  export let brandSrc: string = "/HS-LOGO.png";
  export let showBrand: boolean | undefined = undefined; // default derives from showControls
  $: showBrandEffective = (showBrand ?? showControls) && !!brandSrc;

  /** Effects */
  // Fireworks removed by request. Keep completion ring and subtle transitions.
  export let celebrateOnComplete: boolean = true;

  /** Debug */
  export let DEBUG = false;

  // ── Events (union of new + old) ─────────────────────────────────────────────
  const dispatch = createEventDispatcher<{
    complete: void;
    wrong: void;
    shuffle: void;
    clear: { clearedSolved: boolean };
    loaded: { puzzleId: string | number; title: string };
    error: { message: string };
    solve: { groupId: "A" | "B" | "C" | "D"; name: string };

    // old compatibility events
    progress: number[]; // selected SI indices
    progressDetail: { si: number[]; orig: number[]; words: string[] };
    state: {
      order: number[];
      solvedByOrig: boolean[];
      solvedByGroup: boolean[];
      selectedSi: number[];
      selectedOrig: number[];
      selectedWords: string[];
    };
  }>();

  // ── Local state ─────────────────────────────────────────────────────────────
  let loading = true;
  let err: string | null = null;

  // engine state
  let order: string[] = [];          // array of word ids in grid order
  let selection: string[] = [];      // selected word ids (by id)
  let solved: Array<"A" | "B" | "C" | "D"> = [];
  let showRing = false;

  // toolbar presence (for slot detection)
  // @ts-ignore
  const hasGridSlot: boolean = !!($$slots?.grid);
  // @ts-ignore
  const hasToolbarSlot: boolean = !!($$slots?.toolbar);

  // ── Helpers: shape adaptation ───────────────────────────────────────────────
  type EngineWord = { id: string; text: string; groupId: "A"|"B"|"C"|"D" };
  type EnginePuzzle = {
    id?: string | number;
    title: string;
    words: EngineWord[];
  };

  // Require presence (not truthiness) of fields so blank text is okay
  function isEngineShape(p: any): p is EnginePuzzle {
    const w0 = p?.words?.[0];
    return Array.isArray(p?.words) && !!w0 && ("id" in w0) && ("groupId" in w0) && ("text" in w0);
  }

  function adaptFromDataStore(p: DataPuzzle): EnginePuzzle {
    const words: EngineWord[] = p.words.map((w, i) => ({
      id: w.id ?? String(i),
      text: w.text ?? w.word ?? "",
      // coerce to A-D safely
      groupId: (w.groupId ?? ["A","B","C","D"][i % 4]) as "A"|"B"|"C"|"D"
    }));
    return { id: p.id, title: p.title ?? "Untitled", words };
  }

  // Reactive adaptation for incoming puzzle
  $: if (puzzle && !isEngineShape(puzzle)) {
    puzzle = adaptFromDataStore(puzzle as unknown as DataPuzzle);
  }

  // convenience lookups based on the current puzzle
  $: words = (puzzle?.words ?? []) as EngineWord[];
  $: groupsMap = words.reduce<Record<"A"|"B"|"C"|"D", EngineWord[]>>((acc, w) => {
    (acc[w.groupId] ??= []).push(w);
    return acc;
  }, { A:[], B:[], C:[], D:[] } as any);

  // ids
  $: allIds = words.map(w => w.id);

  // si (slot index) -> orig index mapping using order of allIds
  function siToOrig(si: number): number {
    const id = order[si];
    return allIds.indexOf(id);
  }

  // Map Firestore/preview categories into a simple titles array once.
  $: catTitles = Array.isArray((puzzle as any)?.categories)
    ? (puzzle as any).categories.map((c: any) =>
        (c?.title ?? c?.name ?? "").toString().trim()
      )
    : [];

  // Index map A/B/C/D → 0/1/2/3
  const GI = { A: 0, B: 1, C: 2, D: 3 } as const;

  // Title resolver (strictly Firestore/preview titles; no ABCD fallback)
  function titleFor(gid: GID): string {
    return catTitles[GI[gid]] ?? "";
  }

  // Emit legacy/new state for external listeners
  function emitNow() {
    // Translate current selection to both si and orig + text for compatibility
    const si = selection.map(id => order.indexOf(id)).filter(i => i >= 0);
    const orig = si.map(siToOrig);
    const wordsSel = orig.map((oi) => words[oi]?.text ?? "");

    dispatch("progress", si);
    dispatch("progressDetail", { si, orig, words: wordsSel });

    // group completion mask (by original order)
    const solvedByOrig = allIds.map((id) => {
      const idx = allIds.indexOf(id);
      const gid = words[idx]?.groupId;
      return solved.includes(gid as any);
    });
    const solvedByGroup = (["A","B","C","D"] as const).map(g => solved.includes(g));

    dispatch("state", {
      order: order.map((id) => allIds.indexOf(id)),
      solvedByOrig,
      solvedByGroup,
      selectedSi: si,
      selectedOrig: orig,
      selectedWords: wordsSel
    });
  }

  // ── Initialization / Resume ─────────────────────────────────────────────────
  async function hydrate() {
    loading = true; err = null;
    try {
      if (!puzzle) throw new Error("No puzzle provided");
      // Build order either from resume or a shuffled seed (new visual keeps)
      if (resumeState?.order?.length === words.length) {
        // resume using original-index mapping -> convert to ids
        order = resumeState.order.map((orig) => allIds[orig]);
      } else {
        const seed = initialSeed;
        const ids = [...allIds];
        const idxs = shuffled(ids.map((_, i) => i), seed);
        order = idxs.map(i => ids[i]);
      }

      // resume selection (prefer words array)
      if (resumeState?.selectedWords?.length) {
        selection = resumeState.selectedWords
          .map((txt) => words.find((w) => w.text === txt)?.id)
          .filter(Boolean) as string[];
      } else if (resumeState?.selectedOrig?.length) {
        selection = resumeState.selectedOrig.map((i) => allIds[i]);
      } else if (resumeState?.selectedSi?.length) {
        selection = resumeState.selectedSi.map((si) => order[si]).filter(Boolean);
      } else {
        selection = [];
      }

      // resume solved flags (per-orig)
      if (resumeState?.solvedByOrig?.length === allIds.length) {
        const solvedGroups = new Set<"A"|"B"|"C"|"D">();
        resumeState.solvedByOrig.forEach((flag, i) => {
          if (flag) solvedGroups.add(words[i]?.groupId);
        });
        solved = Array.from(solvedGroups);
      } else {
        solved = [];
      }

      justSolvedIds = [];
      await tick();
      dispatch("loaded", { puzzleId: (puzzle?.id ?? puzzleId ?? "live") as any, title: puzzle?.title ?? "Untitled" });
      emitNow();
    } catch (e: any) {
      err = e?.message ?? "Failed to load";
      dispatch("error", { message: err });
    } finally {
      loading = false;
    }
  }

  onMount(hydrate);
  $: if (puzzle) { /* re-hydrate if a different puzzle arrives */ }

  // ── Actions ────────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    if (selection.includes(id)) {
      selection = selection.filter(x => x !== id);
    } else if (selection.length < 4) {
      selection = [...selection, id];
      if (selection.length === 4) {
        checkSelection();
      } else {
        emitNow();
      }
    } else {
      // replace oldest to keep UX snappy
      selection = [...selection.slice(1), id];
      emitNow();
    }
  }

  function clearSelection() {
    const hadSolved = solved.length > 0;
    selection = [];
    dispatch("clear", { clearedSolved });
    emitNow();
  }

  function shuffle() {
    const ids = [...order];
    const idxs = shuffled(ids.map((_, i) => i), Math.floor(Math.random()*100000));
    order = idxs.map(i => ids[i]);
    selection = [];
    shaking = false;
    dispatch("shuffle");
    emitNow();
  }

  async function commitSelection() {
    if (!puzzle) return;
    const selected = selection.map(id => words.find(w => w.id === id)!);
    const groupId = selected[0].groupId;
    const allSame = selected.every(w => w.groupId === groupId);
    if (allSame) {
      // mark group solved
      solved = [...new Set([...solved, groupId])];
      dispatch("solve", { groupId, name: groupName(groupId) });
      selection = [];
      if (solved.length === 4) {
        dispatch("complete");
        if (celebrateOnComplete) {
          showRing = true;
          setTimeout(() => (showRing = false), 1600);
        }
      }
    } else {
      shaking = true;
      setTimeout(() => (shaking = false), 450);
      dispatch("wrong");
      emitNow();
      setTimeout(() => {
        shaking = false;
        selection = [];
        resolving = false;
        emitNow();
      }, RESOLVE_WRONG_MS);
    }
  }
</script>

<!-- ── Layout ───────────────────────────────────────────────────────────────── -->
<div class="w-full flex flex-col items-center gap-4">
  <!-- Brand (optional) -->
  {#if showBrandEffective}
    <img src={brandSrc} alt="brand" class="h-8 opacity-80 mt-2" />
  {/if}

<!-- Toolbar (new look, Tailwind only) -->
{#if showControls}
  <div class="flex items-center justify-center gap-3">
    <button
      class="rounded-xl px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-sm transition active:scale-[.98]"
      on:click={shuffle}
      aria-label="Shuffle"
    >Shuffle</button>

    <button
      class="rounded-xl px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-sm transition active:scale-[.98]"
      on:click={clearSelection}
      aria-label="Clear"
    >Clear</button>
  </div>
{/if}


  <!-- Grid -->
<div class="grid grid-cols-4 gap-2 w-full max-w-[680px] px-3 sm:px-0">
  {#each order as id (id)}
    {@const w = words.find((w) => w.id === id)}
    {#if w}
      <PuzzleCard
        text={w.text}
        wordId={id}
        selected={selection.includes(id)}
        locked={solved.includes(w.groupId)}
        label={groupName(w.groupId)}
        on:toggle={(e) => toggleSelect(e.detail.wordId)}
      />
    {/if}
  {/each}
</div>



  <!-- Completion Ring -->
  {#if showRing}
    <div class="mt-4">
      <CompletionRing size={88} />
    </div>
  {/if}

  {#if DEBUG}
    <pre class="text-xs text-zinc-500 mt-4">{JSON.stringify({ order, selection, solved }, null, 2)}</pre>
  {/if}
</div>

<style>
  /* All visuals are Tailwind classes; keeping style tag minimal for Svelte scoping if needed */
</style>
