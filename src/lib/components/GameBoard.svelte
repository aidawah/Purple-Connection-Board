<script lang="ts">
  import { onMount, tick, createEventDispatcher } from "svelte";
  import type { Puzzle as DataPuzzle } from "$lib/data/puzzles";
  import { shuffled } from "$lib/gameLogic";
  import PuzzleCard from "$lib/components/PuzzleCard.svelte";
  import CompletionRing from "$lib/effects/CompletionRing.svelte";
  import { initRunPersistence, type RunState } from "$lib/useRunPersistence";

  export let puzzleId: string | number | null = null;
  export let puzzle: EnginePuzzle | DataPuzzle | null = null;
  export let initialSeed: number = 42;

  export let resumeState:
    | { order?: number[]; solvedByOrig?: boolean[]; selectedOrig?: number[]; selectedSi?: number[]; selectedWords?: string[] }
    | null = null;

  export let showControls: boolean = true;
  // brand disabled by default; only renders if parent sets showBrand={true} and provides a src
  export let brandSrc: string | null = null;
  export let showBrand: boolean = false;
  $: showBrandEffective = Boolean(showBrand && brandSrc);

  export let celebrateOnComplete: boolean = true;
  export let DEBUG = false;
  export let enablePersistence: boolean = true;

  type GID = "A" | "B" | "C" | "D";
  const dispatch = createEventDispatcher<{
    complete: void; wrong: void; shuffle: void;
    clear: { clearedSolved: boolean };
    loaded: { puzzleId: string | number; title: string };
    error: { message: string };
    solve: { groupId: GID; name: string };
    progress: number[]; progressDetail: { si: number[]; orig: number[]; words: string[] };
    state: {
      order: number[]; solvedByOrig: boolean[]; solvedByGroup: boolean[];
      selectedSi: number[]; selectedOrig: number[]; selectedWords: string[];
    };
  }>();

  let loading = true;
  let err: string | null = null;

  type EngineWord = { id: string; text: string; groupId: GID };
  type EnginePuzzle = {
    id?: string | number;
    title: string;
    words: EngineWord[];
    categories?: Array<{ title?: string; name?: string; words?: any }>;
    description?: string;
  };

  let order: string[] = [];
  let selection: string[] = [];
  let solved: Array<GID> = [];
  let foundIds: string[][] = [];
  let moves = 0;
  let completed = false;
  let shaking = false;
  let showRing = false;
  let resolving = false;

  let liveGroupTitle: Record<GID, string> = { A: "Group A", B: "Group B", C: "Group C", D: "Group D" };
  let solvedTitleByGroup: Record<GID, string> = { A: "", B: "", C: "", D: "" };

  const RESOLVE_WRONG_MS = 450;
  const RESOLVE_CORRECT_MS = 350;

  $: puzzleKey = String(puzzle?.id ?? puzzleId ?? "live");
  let persist: ReturnType<typeof initRunPersistence> | null = null;

  function getRunState(): RunState {
    return {
      title: (puzzle as any)?.title ?? "",
      author: (puzzle as any)?.author ?? "",
      moves, completed, selectedIds: selection, foundIds, seed: initialSeed
    };
  }
  function applyRunState(s: Partial<RunState>) {
    if (Array.isArray(s.selectedIds)) selection = s.selectedIds.filter((id) => allIds.includes(id));
    if (Array.isArray(s.foundIds))    foundIds = s.foundIds.map(set => set.filter((id) => allIds.includes(id)));
    if (typeof s.moves === "number")  moves = s.moves;
    if (typeof s.completed === "boolean") completed = s.completed;
    if (typeof s.seed === "number")   initialSeed = s.seed;

    const set = new Set<GID>();
    for (const group of foundIds) for (const id of group) set.add(gidOf(id));
    solved = Array.from(set);
  }
  function persistDebounced() { persist?.persistDebounced(250); }

  function isEngineShape(p: any): p is EnginePuzzle {
    const w0 = p?.words?.[0];
    return Array.isArray(p?.words) && !!w0 && ("id" in w0) && ("groupId" in w0) && ("text" in w0);
  }
  function adaptFromDataStore(p: any): EnginePuzzle {
    const words: EngineWord[] = (p?.words ?? []).map((w: any, i: number) => ({
      id: w?.id ?? String(i),
      text: w?.text ?? w?.word ?? "",
      groupId: (w?.groupId ?? ["A","B","C","D"][i % 4]) as GID
    }));
    const categories = Array.isArray(p?.categories) ? p.categories : undefined;
    return { id: p?.id, title: p?.title ?? "Untitled", words, categories, description: p?.description };
  }
  $: if (puzzle && !isEngineShape(puzzle)) { puzzle = adaptFromDataStore(puzzle); }

  $: words = (puzzle?.words ?? []) as EngineWord[];
  $: allIds = words.map((w) => w.id);
  function siToOrig(si: number): number { const id = order[si]; return allIds.indexOf(id); }
  function gidOf(id: string): GID {
    const w = words.find((x) => x.id === id);
    return (w?.groupId ?? "A") as GID;
  }

  function normalize(s: any) {
    return (s ?? "").toString().trim().toLowerCase()
      .replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s'-]/gu, "");
  }
  function toArrayLike<T = unknown>(v: any): T[] {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "object") return Object.values(v) as T[];
    return [];
  }
  function coerceWordList(raw: any): string[] {
    const arr = toArrayLike<any>(raw);
    const out: string[] = [];
    for (const item of arr) {
      if (typeof item === "string") out.push(item);
      else if (item && typeof item === "object") {
        const cand = item.text ?? item.word ?? item.value ?? "";
        if (typeof cand === "string" && cand) out.push(cand);
      }
    }
    return out;
  }
  function wordsByGroup(): Record<GID, string[]> {
    const g: Record<GID, string[]> = { A: [], B: [], C: [], D: [] };
    for (const w of words) g[w.groupId].push(w.text);
    return g;
  }
  function buildCategorySets() {
    const cats = toArrayLike<any>((puzzle as any)?.categories);
    const titles: string[] = [];
    const sets: Array<Set<string>> = [];
    for (const c of cats) {
      if (!c || typeof c !== "object") continue;
      const title = String(c.title ?? c.name ?? "").trim();
      if (!title) continue;
      const wl = coerceWordList(c.words).map(normalize);
      if (wl.length) { titles.push(title); sets.push(new Set(wl)); }
    }
    return { titles, sets };
  }
  function bestTitleForGroup(groupWords: string[], titles: string[], sets: Array<Set<string>>): string {
    if (!groupWords.length) return "";
    const gw = groupWords.map(normalize);
    const scores = sets.map((set) => gw.reduce((a, w) => a + (set.has(w) ? 1 : 0), 0));
    const best = Math.max(0, ...scores);
    const bestIdxs = scores.map((s,i)=>({s,i})).filter(x=>x.s===best).map(x=>x.i);
    if (best === 4) return titles[bestIdxs[0]] ?? "";
    if (best >= 2 && bestIdxs.length === 1) return titles[bestIdxs[0]] ?? "";
    return "";
  }
  function computeLiveTitles(): Record<GID, string> {
    const out: Record<GID, string> = { A: "", B: "", C: "", D: "" };
    const { titles, sets } = buildCategorySets();
    const groups = wordsByGroup();
    (["A","B","C","D"] as GID[]).forEach((gid) => {
      const title = bestTitleForGroup(groups[gid] ?? [], titles, sets);
      out[gid] = title || `Group ${gid}`;
    });
    if (DEBUG) {
      console.info("[GameBoard] categories titles:", titles);
      console.info("[GameBoard] groups:", groups);
      console.info("[GameBoard] liveGroupTitle:", out);
    }
    return out;
  }
  $: liveGroupTitle = computeLiveTitles();

  function titleForCard(_wordText: string, gid: GID): string {
    return (solvedTitleByGroup[gid] && solvedTitleByGroup[gid].trim())
      ? solvedTitleByGroup[gid]
      : liveGroupTitle[gid];
  }

  function emitNow() {
    const si = selection.map((id) => order.indexOf(id)).filter((i) => i >= 0);
    const orig = si.map(siToOrig);
    const wordsSel = orig.map((oi) => words[oi]?.text ?? "");
    dispatch("progress", si);
    dispatch("progressDetail", { si, orig, words: wordsSel });
    const solvedByOrig = allIds.map((id) => solved.includes(gidOf(id)));
    const solvedByGroup = (["A","B","C","D"] as const).map((g) => solved.includes(g));
    dispatch("state", {
      order: order.map((id) => allIds.indexOf(id)),
      solvedByOrig, solvedByGroup, selectedSi: si, selectedOrig: orig, selectedWords: wordsSel
    });
  }

  async function hydrate() {
    loading = true; err = null;
    try {
      if (!puzzle) throw new Error("No puzzle provided");

      if (resumeState?.order?.length === allIds.length) {
        order = resumeState.order.map((orig) => allIds[orig]);
      } else {
        const ids = [...allIds];
        const idxs = shuffled(ids.map((_, i) => i), initialSeed);
        order = idxs.map((i) => ids[i]);
      }

      selection = []; foundIds = []; solved = [];
      moves = 0; completed = false;
      solvedTitleByGroup = { A: "", B: "", C: "", D: "" };

      persist = null;
      if (enablePersistence) {
        try {
          persist = initRunPersistence({
            puzzleId: puzzleKey,
            getState: getRunState,
            applyState: applyRunState
          });
          await persist.load();
        } catch (e) {
          console.warn("[persist] disabled due to error:", e);
          persist = null;
        }
      }

      await tick();
      dispatch("loaded", { puzzleId: (puzzle?.id ?? puzzleId ?? "live") as string | number, title: puzzle?.title ?? "Untitled" });
      emitNow();
    } catch (e: any) {
      err = e?.message ?? "Failed to load";
      dispatch("error", { message: err });
    } finally {
      loading = false;
    }
  }
  onMount(hydrate);

  function toggleSelect(id: string) {
    if (resolving) return;
    if (selection.includes(id)) {
      selection = selection.filter((x) => x !== id);
      emitNow(); persistDebounced(); return;
    }
    if (selection.length >= 4) return;
    selection = [...selection, id]; moves += 1;
    if (selection.length === 4) { checkSelection(); } else { emitNow(); persistDebounced(); }
  }
  function clearSelection() {
    if (resolving) return;
    const hadSolved = solved.length > 0;
    selection = []; shaking = false;
    dispatch("clear", { clearedSolved: hadSolved });
    emitNow(); persistDebounced();
  }
  function shuffle() {
    if (resolving) return;
    const ids = [...order];
    const idxs = shuffled(ids.map((_, i) => i), Math.floor(Math.random() * 100000));
    order = idxs.map((i) => ids[i]);
    shaking = false;
    dispatch("shuffle");
    emitNow();
    persistDebounced();
  }

  function checkSelection() {
    if (!puzzle) return;
    resolving = true;

    const picked = selection.map((id) => words.find((w) => w.id === id)!);
    const groupId = picked[0].groupId as GID;
    const allSame = picked.every((w) => w.groupId === groupId);

    if (allSame) {
      const title = liveGroupTitle[groupId] || `Group ${groupId}`;
      solvedTitleByGroup[groupId] = title;

      solved = [...new Set([...solved, groupId])];
      if (selection.length === 4) foundIds = [...foundIds, [...selection]];

      dispatch("solve", { groupId, name: title });
      emitNow(); persistDebounced();

      setTimeout(() => {
        selection = [];
        if (solved.length === 4) {
          dispatch("complete"); completed = true; persistDebounced();
          if (celebrateOnComplete) { showRing = true; setTimeout(() => (showRing = false), 1600); }
        }
        resolving = false; emitNow(); persistDebounced();
      }, RESOLVE_CORRECT_MS);
    } else {
      shaking = true; dispatch("wrong"); moves += 1; emitNow(); persistDebounced();
      setTimeout(() => {
        shaking = false; selection = []; resolving = false; emitNow(); persistDebounced();
      }, RESOLVE_WRONG_MS);
    }
  }

  // Bind the grid wrapper so CompletionRing can align to it
  let gridWrap: HTMLDivElement | null = null;
</script>

<div class="w-full flex flex-col items-center gap-4 min-h-screen"
     style="
       background: var(--puzzle-bg, #fef9c3);
       background-image: var(--puzzle-bg-image, none);
       background-size: cover;
       background-position: center;
       background-repeat: no-repeat;
     ">
  {#if showBrandEffective}
    <img src={brandSrc!} alt="brand" class="h-8 opacity-80 mt-2" />
  {/if}

  {#if showControls}
    <div class="flex items-center justify-center gap-3">
      <button class="rounded-xl px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-sm transition active:scale-[.98]" on:click={shuffle}>Shuffle</button>
      <button class="rounded-xl px-4 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 shadow-sm transition active:scale-[.98]" on:click={clearSelection}>Clear</button>
    </div>
  {/if}

  <!-- Make this the anchor; the ring measures this rect to place the burst -->
  <div bind:this={gridWrap} class="relative grid grid-cols-4 gap-2 w-full max-w-[680px] px-3 sm:px-0" class:animate-puzzle-shake={shaking}>
    {#each order as id (id)}
      {@const w = words.find((w) => w.id === id)}
      {#if w}
        <button
          type="button"
          on:click={() => toggleSelect(id)}
          class="relative w-full h-full rounded-xl focus:outline-none group
                 [perspective:1000px] select-none"
          aria-pressed={selection.includes(id)}
          disabled={resolving || solved.includes(w.groupId)}
          data-locked={solved.includes(w.groupId)}
          data-selected={selection.includes(id)}
          data-word={w.text}
          data-id={id}
          data-group={w.groupId}
        >
          <div
            class="relative w-full h-[70px] sm:h-[92px] md:h-[100px]
                   transition-transform duration-300
                   [transform-style:preserve-3d]
                   group-data-[locked=true]:[transform:rotateY(180deg)]"
          >
            <!-- FRONT -->
            <div class="absolute inset-0 [backface-visibility:hidden]">
              <PuzzleCard
                text={w.text}
                wordId={id}
                selected={selection.includes(id)}
                locked={solved.includes(w.groupId)}
                label={titleForCard(w.text, w.groupId)}
              />
            </div>

            <!-- BACK -->
            <div class="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]
                        rounded-xl border border-teal-600 bg-teal-500 text-white
                        grid place-items-center px-2 text-sm sm:text-base font-semibold text-center">
              {titleForCard(w.text, w.groupId)}
            </div>
          </div>
        </button>
      {/if}
    {/each}
  </div>

  <!-- Canvas-based completion effect aligned to the grid wrapper -->
  <CompletionRing
    visible={showRing}
    anchor={gridWrap}
    spotImage="HealthSpaces_Icon6_circle.png"
    pad={36}
    patternScale={2.4}

    
    slowFactor={0.55}
    autoHideMs={3200}
    durationMin={1.4}
    durationMax={2.2}
    sizeMin={28}
    sizeMax={44}
    debug={false}
  />

  {#if DEBUG}
    <pre class="text-xs text-zinc-500 mt-4">
{JSON.stringify({
  order, selection, solved, foundIds, moves, completed,
  liveGroupTitle, solvedTitleByGroup,
  categories: (puzzle as any)?.categories
}, null, 2)}
    </pre>
  {/if}
</div>

<style>
  /* Tailwind handles visuals */
</style>
