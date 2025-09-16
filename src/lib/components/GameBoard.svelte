<script lang="ts">
  import { onMount, tick, createEventDispatcher } from "svelte";
  import type { Puzzle as DataPuzzle } from "$lib/data/puzzles";
  import type { Puzzle } from "$lib/types";
  import { groupName, shuffled } from "$lib/gameLogic";
  import PuzzleCard from "$lib/components/PuzzleCard.svelte";
  import CompletionRing from "$lib/effects/CompletionRing.svelte";

  // ── Props ────────────────────────────────────────────────────────────────────
  export let puzzleId: string | number | null = null;   // optional id
  export let puzzle: Puzzle | null = null;              // accepts engine or datastore shape
  export let initialSeed: number = 42;

  // Optional resume compatibility
  export let resumeState:
    | {
        order?: number[];              // si -> orig index
        solvedByOrig?: boolean[];      // per-orig solved flags
        selectedOrig?: number[];
        selectedSi?: number[];
        selectedWords?: string[];
      }
    | null = null;

  // UI / theme
  export let showControls = true;
  export let brandSrc = "/HS-LOGO.png";
  export let showBrand: boolean | undefined = undefined;
  $: showBrandEffective = (showBrand ?? showControls) && !!brandSrc;

  export let celebrateOnComplete = true;
  export let DEBUG = false;

  // ── Events (new + old compat) ───────────────────────────────────────────────
  const dispatch = createEventDispatcher<{
    complete: void;
    wrong: void;
    shuffle: void;
    clear: { clearedSolved: boolean };
    loaded: { puzzleId: string | number; title: string };
    error: { message: string };
    solve: { groupId: "A" | "B" | "C" | "D"; name: string };

    progress: number[];
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

  let order: string[] = [];                // ids in grid order
  let selection: string[] = [];            // selected ids (max 4)
  let solved: Array<"A" | "B" | "C" | "D"> = [];
  let showRing = false;

  // responsive autosize
  let toolbarEl: HTMLElement | null = null;
  let gridEl: HTMLElement | null = null;
  let cellPx = 120;

  // ── Shapes / helpers ────────────────────────────────────────────────────────
  type EngineWord = { id: string; text: string; groupId: "A"|"B"|"C"|"D" };
  type EnginePuzzle = {
    id?: string | number;
    title: string;
    words: EngineWord[];
    groups?: Array<{ id: "A"|"B"|"C"|"D"; name: string }>;
  };

  function isEngineShape(p: any): p is EnginePuzzle {
    return Array.isArray(p?.words) && !!p.words[0]?.id && !!p.words[0]?.text && !!p.words[0]?.groupId;
  }

  // Accepts either `solution.groups` shape or flat words shape
  function adaptFromDataStore(real: DataPuzzle): EnginePuzzle {
    const hasGroupArray =
      Array.isArray((real as any)?.solution?.groups) &&
      (real as any).solution.groups.length > 0 &&
      Array.isArray((real as any).solution.groups[0]?.words);

    if (hasGroupArray) {
      const letters = ["A","B","C","D"] as const;
      const groups = (real as any).solution.groups.slice(0, 4);
      const words: EngineWord[] = [];
      const groupsMeta: Array<{ id: "A"|"B"|"C"|"D"; name: string }> = [];
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const G = letters[gi];
        groupsMeta.push({ id: G, name: g?.name ?? `Group ${G}` });
        const wlist = Array.isArray(g?.words) ? g.words : [];
        for (let wi = 0; wi < wlist.length; wi++) {
          words.push({ id: `${G}${wi + 1}`, text: String(wlist[wi]), groupId: G });
        }
      }
      return { id: (real as any).id, title: (real as any).title ?? "Untitled", words, groups: groupsMeta };
    }

    // Fallback: assume flat list
    const words: EngineWord[] = (real as any).words.map((w: any, i: number) => ({
      id: w.id ?? String(i),
      text: w.text ?? w.word ?? "",
      groupId: (w.groupId ?? ["A","B","C","D"][i % 4]) as "A"|"B"|"C"|"D"
    }));
    return { id: (real as any).id, title: (real as any).title ?? "Untitled", words };
  }

  // Adapt incoming puzzle if needed
  $: if (puzzle && !isEngineShape(puzzle)) {
    puzzle = adaptFromDataStore(puzzle as unknown as DataPuzzle);
  }

  // convenience
  $: words = (puzzle?.words ?? []) as EngineWord[];
  $: allIds = words.map(w => w.id);
  $: groupsMeta = (puzzle as any)?.groups ?? null;

  function getGroupName(gid: "A"|"B"|"C"|"D"): string {
    const byMeta = groupsMeta?.find?.((g: any) => g.id === gid)?.name;
    if (byMeta) return byMeta;
    try { const maybe = (groupName as any)(puzzle, gid); if (typeof maybe === "string" && maybe) return maybe; } catch {}
    try { const maybe2 = (groupName as any)(gid); if (typeof maybe2 === "string" && maybe2) return maybe2; } catch {}
    return `Group ${gid}`;
  }

  // ── Old compat event emission ───────────────────────────────────────────────
  function siToOrig(si: number): number {
    const id = order[si];
    return allIds.indexOf(id);
  }

  function emitNow() {
    const si = selection.map(id => order.indexOf(id)).filter(i => i >= 0);
    const orig = si.map(siToOrig);
    const wordsSel = orig.map((oi) => words[oi]?.text ?? "");

    dispatch("progress", si);
    dispatch("progressDetail", { si, orig, words: wordsSel });

    const solvedByOrig = allIds.map((_, i) => solved.includes(words[i]?.groupId as any));
    const solvedByGroup = (["A","B","C","D"] as const).map(g => solved.includes(g));
    dispatch("state", {
      order: order.map(id => allIds.indexOf(id)),
      solvedByOrig,
      solvedByGroup,
      selectedSi: si,
      selectedOrig: orig,
      selectedWords: wordsSel,
    });
  }

  // ── Autosize 4×4 grid to viewport (small-screen friendly) ──────────────────
  function recalcCell() {
    if (typeof window === "undefined") return;
    // Safe-area + small-screen tweaks
    const pad = Math.max(16, Math.min(24, Math.floor(window.innerWidth * 0.04))); // 4vw cap
    const gap = 12;
    const rows = 4, cols = 4;

    const maxW = window.innerWidth - 2 * pad;
    const tbH = (toolbarEl?.offsetHeight ?? 56);
    const maxH = window.innerHeight - 2 * pad - tbH - 16;

    const cellW = (maxW - gap * (cols - 1)) / cols;
    const cellH = (maxH - gap * (rows - 1)) / rows;

    // Clamp gives good feel from small phones → laptops
    cellPx = Math.round(Math.max(68, Math.min(156, Math.min(cellW, cellH))));
  }

  // Tiny JS shaker (no custom CSS)
  function shakeGrid() {
    if (!gridEl) return;
    const steps = [-1, 2, -4, 4, -2, 1, 0];
    let i = 0;
    const doStep = () => {
      if (!gridEl) return;
      gridEl.style.transform = `translateX(${steps[i]}px)`;
      i++;
      if (i < steps.length) requestAnimationFrame(doStep);
      else setTimeout(() => { if (gridEl) gridEl.style.transform = ""; }, 80);
    };
    requestAnimationFrame(doStep);
  }

  // ── Load / hydrate ─────────────────────────────────────────────────────────
  async function hydrate() {
    loading = true; err = null;
    try {
      if (!puzzle) throw new Error("No puzzle provided");

      // order from resume or seed
      if (resumeState?.order?.length === words.length) {
        order = resumeState.order.map((orig) => allIds[orig]);
      } else {
        const idxs = shuffled(allIds.map((_, i) => i), initialSeed);
        order = idxs.map(i => allIds[i]);
      }

      // resume selection
      if (resumeState?.selectedWords?.length) {
        selection = resumeState.selectedWords
          .map(txt => words.find(w => w.text === txt)?.id)
          .filter(Boolean) as string[];
      } else if (resumeState?.selectedOrig?.length) {
        selection = resumeState.selectedOrig.map(i => allIds[i]);
      } else if (resumeState?.selectedSi?.length) {
        selection = resumeState.selectedSi.map(si => order[si]).filter(Boolean);
      } else {
        selection = [];
      }

      // resume solved
      if (resumeState?.solvedByOrig?.length === allIds.length) {
        const solvedGroups = new Set<"A"|"B"|"C"|"D">();
        resumeState.solvedByOrig.forEach((flag, i) => { if (flag) solvedGroups.add(words[i]?.groupId); });
        solved = Array.from(solvedGroups);
      } else {
        solved = [];
      }

      await tick();
      dispatch("loaded", { puzzleId: (puzzle?.id ?? puzzleId ?? "live") as any, title: puzzle?.title ?? "Untitled" });
      emitNow();
    } catch (e:any) {
      err = e?.message ?? "Failed to load";
      dispatch("error", { message: err });
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    (async () => {
      if (!puzzle) {
        const pid = puzzleId ?? "";
        if (pid !== "") {
          try {
            const dm = await import("$lib/data/puzzles");
            const real = (dm as any).getPuzzleById?.(Number(pid));
            if (real) puzzle = adaptFromDataStore(real as DataPuzzle);
          } catch {}
        }
        if (!puzzle) {
          const mod = await import("$lib/dev/puzzles");
          const MOCK_PUZZLES: Array<Puzzle & { id: string | number }> = mod.MOCK_PUZZLES;
          const found = MOCK_PUZZLES.find(p => String(p.id) === String(puzzleId ?? "")) ?? null;
          if (found) puzzle = (isEngineShape(found) ? found : adaptFromDataStore(found as any)) as any;
        }
      }
      if (!puzzle) {
        err = "Puzzle not found.";
        loading = false;
        dispatch("error", { message: err });
        return;
      }

      // initial order + cell sizing
      order = shuffled(puzzle.words.map(w => w.id), initialSeed);
      hydrate();
      recalcCell();

      const onR = () => recalcCell();
      window.addEventListener("resize", onR);
      return () => window.removeEventListener("resize", onR);
    })();
  });

  // ── Game actions (flip on correct, shake+deselect on wrong) ─────────────────
  function isLocked(id: string) {
    const gid = words.find(w => w.id === id)?.groupId;
    return gid ? solved.includes(gid as any) : false;
  }

  function toggleSelect(id: string) {
    if (isLocked(id)) return;

    if (selection.includes(id)) {
      selection = selection.filter(x => x !== id);
      emitNow();
      return;
    }
    if (selection.length < 4) {
      selection = [...selection, id];
      if (selection.length === 4) {
        commitSelection();
      } else {
        emitNow();
      }
      return;
    }
    // replace oldest to keep UX snappy
    selection = [...selection.slice(1), id];
    emitNow();
  }

  function clearSelection(e?: MouseEvent) {
    const clearedSolved = !!(e && (e.shiftKey || e.ctrlKey || e.metaKey));
    if (clearedSolved) solved = [];
    selection = [];
    dispatch("clear", { clearedSolved });
    emitNow();
  }

  function shuffleUnsolved() {
    if (!puzzle) return;

    const unsolvedIds = puzzle.words
      .filter(w => !solved.includes(w.groupId))
      .map(w => w.id);

    const positions = order
      .map((id, i) => ({ id, i }))
      .filter(x => unsolvedIds.includes(x.id))
      .map(x => x.i);

    const shuffledIds = shuffled(unsolvedIds, Math.floor(Math.random() * 1e9));
    const next = [...order];
    positions.forEach((pos, k) => (next[pos] = shuffledIds[k]));
    order = next;
    selection = [];
    dispatch("shuffle");
    emitNow();
  }

  async function commitSelection() {
    if (!puzzle) return;

    const picks = selection
      .map((id) => puzzle!.words.find((w) => w.id === id))
      .filter(Boolean) as Array<{ id: string; text: string; groupId: "A" | "B" | "C" | "D" }>;

    const allSameGroup = picks.length === 4 && new Set(picks.map((w) => w.groupId)).size === 1;
    const gid = allSameGroup ? picks[0].groupId : null;

    if (gid && !solved.includes(gid)) {
      // ✅ Correct: mark solved → cards flip (locked=true)
      solved = [...solved, gid];
      selection = [];

      const name = getGroupName(gid);
      dispatch("solve", { groupId: gid, name });

      if (solved.length === 4) {
        showRing = false;
        await tick();
        showRing = true;
        dispatch("complete");
      }
    } else {
      // ❌ Wrong: shake + deselect
      shakeGrid();
      selection = [];
      dispatch("wrong");
    }
    emitNow();
  }
</script>

{#if loading}
  <p class="max-w-7xl mx-auto px-6 py-6 opacity-70">Loading…</p>
{:else if err}
  <pre class="max-w-7xl mx-auto px-6 py-6 text-red-400">{err}</pre>
{:else}
  <div class="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 grid grid-rows-[auto_1fr] gap-4 min-h-[100dvh]">
    <!-- Toolbar -->
    <div
      bind:this={toolbarEl}
      class="sticky top-[env(safe-area-inset-top,0)] z-10 flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#1a2a43]
             bg-gradient-to-b from-[rgba(18,26,43,.85)] to-[rgba(18,26,43,.65)] backdrop-blur-md"
    >
      {#if showBrandEffective}
        <img src={brandSrc} alt="brand" class="h-7 opacity-80" />
      {/if}

      <h1 class="m-0 text-[18px] sm:text-[20px] font-bold">{puzzle?.title ?? "Puzzle"}</h1>
      <div class="flex-1" />

      {#if showControls}
        <button
          class="inline-flex items-center h-9 px-3 rounded-lg font-semibold bg-[#0f3a38] text-[#bff7ee]
                 border border-[#14615b] hover:bg-[#12524f] hover:border-[#18837a] disabled:opacity-50"
          on:click={(e) => clearSelection(e)}
          disabled={selection.length === 0 && solved.length === 0}
          title="Clear selection (Shift-click to also clear solved groups)"
        >Clear</button>

        <button
          class="inline-flex items-center h-9 px-3 rounded-lg font-semibold border border-[#304a76]
                 text-[#cfe1ff] bg-transparent hover:bg-[#14223d]"
          on:click={shuffleUnsolved}
          title="Shuffle unsolved cards"
        >Shuffle</button>
      {/if}

      <!-- Solved group chips -->
      {#each solved as gid}
        <span class="inline-flex items-center gap-2 rounded-full px-3 h-8 text-sm
                     text-[#0f766e] bg-[rgba(20,184,166,.16)] border border-[rgba(20,184,166,.35)]">
          <span class="w-2 h-2 rounded-full bg-[#0f766e]" />
          {getGroupName(gid)}
        </span>
      {/each}
    </div>

    <!-- Grid (auto-sized for viewport) -->
    <div class="relative w-fit mx-auto">
      {#if showRing}
        <CompletionRing
          visible={showRing}
          spotImage="/images/HealthSpaces_Icon6_circle.png"
          pad={36}
          patternScale={2.0}
          slowFactor={0.75}
          sizeMin={12}
          sizeMax={20}
          autoHideMs={2500}
        />
      {/if}

      <div
        bind:this={gridEl}
        class="grid"
        style={`grid-template-columns: repeat(4, ${cellPx}px); grid-auto-rows: ${cellPx}px; gap:12px;`}
      >
        {#each order as id (id)}
          {@const w = words.find(x => x.id === id)!}
          <PuzzleCard
            text={w.text}
            wordId={w.id}
            selected={selection.includes(w.id)}
            locked={isLocked(w.id)}                
            label={getGroupName(w.groupId)}
            on:toggle={(e) => toggleSelect(e.detail.wordId ?? id)}
          />
        {/each}
      </div>

      {#if DEBUG}
        <pre class="text-xs text-zinc-500 mt-4">{JSON.stringify({ order, selection, solved }, null, 2)}</pre>
      {/if}
    </div>
  </div>
{/if}
