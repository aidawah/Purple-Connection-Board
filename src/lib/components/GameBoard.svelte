<!-- src/lib/components/GameBoard.svelte -->
<script lang="ts">
	import { onMount, tick, createEventDispatcher } from 'svelte';
	import type { Puzzle as DataPuzzle } from '$lib/data/puzzles';
	import type { Puzzle } from '$lib/types';
	import { shuffled } from '$lib/gameLogic'; // ← keep your shuffle; no groupName
	import PuzzleCard from '$lib/components/PuzzleCard.svelte';
	import CompletionRing from '$lib/effects/CompletionRing.svelte';
	import { initRunPersistence, type RunState } from '$lib/useRunPersistence';

	// ── Props ────────────────────────────────────────────────────────────────────
	export let puzzleId: string | number | null = null;
	export let puzzle: Puzzle | null = null;
	export let initialSeed: number = 42;

	export let resumeState: {
		order?: number[];
		solvedByOrig?: boolean[];
		selectedOrig?: number[];
		selectedSi?: number[];
		selectedWords?: string[];
	} | null = null;

	export let showControls: boolean = true;
	export let brandSrc: string = '/HS-LOGO.png';
	export let showBrand: boolean | undefined = undefined;
	$: showBrandEffective = (showBrand ?? showControls) && !!brandSrc;

	export let celebrateOnComplete: boolean = true;
	export let DEBUG = false;

	// ── Events ──────────────────────────────────────────────────────────────────
	const dispatch = createEventDispatcher<{
		complete: void;
		wrong: void;
		shuffle: void;
		clear: { clearedSolved: boolean };
		loaded: { puzzleId: string | number; title: string };
		error: { message: string };
		solve: { groupId: 'A' | 'B' | 'C' | 'D'; name: string };
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

	type GID = 'A' | 'B' | 'C' | 'D';
	type EngineWord = { id: string; text: string; groupId: GID };
	type EnginePuzzle = {
		id?: string | number;
		title: string;
		words: EngineWord[];
		categories?: Array<{ title?: string; name?: string; words?: string[] }>;
	};

	let order: string[] = [];
	let selection: string[] = [];
	let solved: Array<GID> = [];
	let foundIds: string[][] = []; // persisted: solved sets of 4 ids
	let moves = 0; // persisted
	let completed = false; // persisted
	let shaking = false;
	let showRing = false;
	let resolving = false;
	let justSolvedIds: string[] = [];

	const RESOLVE_WRONG_MS = 450;
	const RESOLVE_CORRECT_MS = 350;

	// persistence handle + helpers
	$: puzzleKey = String(puzzle?.id ?? puzzleId ?? 'live');
	let persist: ReturnType<typeof initRunPersistence> | null = null;

	function getRunState(): RunState {
		return {
			title: (puzzle as any)?.title ?? '',
			author: (puzzle as any)?.author ?? '',
			moves,
			completed,
			selectedIds: selection,
			foundIds,
			seed: initialSeed
		};
	}

	function applyRunState(s: Partial<RunState>) {
		if (Array.isArray(s.selectedIds)) selection = s.selectedIds.filter((id) => allIds.includes(id));
		if (Array.isArray(s.foundIds))
			foundIds = s.foundIds.map((set) => set.filter((id) => allIds.includes(id)));
		if (typeof s.moves === 'number') moves = s.moves;
		if (typeof s.completed === 'boolean') completed = s.completed;
		if (typeof s.seed === 'number') initialSeed = s.seed;

		const set = new Set<GID>();
		for (const group of foundIds) for (const id of group) set.add(gidOf(id));
		solved = Array.from(set);
	}

	function persistDebounced() {
		persist?.persistDebounced(250);
	}

	// ── Shape adaptation (preserve categories) ──────────────────────────────────
	function isEngineShape(p: any): p is EnginePuzzle {
		const w0 = p?.words?.[0];
		return Array.isArray(p?.words) && !!w0 && 'id' in w0 && 'groupId' in w0 && 'text' in w0;
	}

	function adaptFromDataStore(p: DataPuzzle): EnginePuzzle {
		const words: EngineWord[] = p.words.map((w: any, i: number) => ({
			id: w?.id ?? String(i),
			text: w?.text ?? w?.word ?? '',
			groupId: (w?.groupId ?? ['A', 'B', 'C', 'D'][i % 4]) as GID
		}));
		const categories = Array.isArray((p as any)?.categories) ? (p as any).categories : undefined;
		return { id: (p as any).id, title: (p as any).title ?? 'Untitled', words, categories };
	}

	$: if (puzzle && !isEngineShape(puzzle)) {
		puzzle = adaptFromDataStore(puzzle as unknown as DataPuzzle);
	}

	// ── Lookups ─────────────────────────────────────────────────────────────────
	$: words = (puzzle?.words ?? []) as EngineWord[];
	$: allIds = words.map((w) => w.id);
	function siToOrig(si: number): number {
		const id = order[si];
		return allIds.indexOf(id);
	}
	function gidOf(id: string): GID {
		const w = words.find((x) => x.id === id);
		return (w?.groupId ?? 'A') as GID;
	}

	// Build a robust map from groupId → category title by matching the 4 words
	function normalize(s: any) {
		return (s ?? '').toString().trim().toLowerCase();
	}

	function buildTitleByGroup(): Record<GID, string> {
		const out: Record<GID, string> = { A: '', B: '', C: '', D: '' };
		const cats: Array<{ title?: string; name?: string; words?: string[] }> = Array.isArray(
			(puzzle as any)?.categories
		)
			? (puzzle as any).categories
			: [];

		if (!cats.length) return out;

		const catWordSets = cats.map((c) => new Set((c?.words ?? []).map(normalize)));

		(['A', 'B', 'C', 'D'] as GID[]).forEach((gid) => {
			const groupWords = words.filter((w) => w.groupId === gid).map((w) => normalize(w.text));
			if (groupWords.length === 0) return;

			let bestIdx = -1;
			let bestScore = -1;
			catWordSets.forEach((set, ci) => {
				const score = groupWords.reduce((acc, w) => acc + (set.has(w) ? 1 : 0), 0);
				if (score > bestScore) {
					bestScore = score;
					bestIdx = ci;
				}
			});

			if (bestIdx >= 0 && bestScore > 0) {
				const title = (cats[bestIdx]?.title ?? cats[bestIdx]?.name ?? '').toString().trim();
				out[gid] = title;
			}
		});

		return out;
	}

	$: titleByGid = buildTitleByGroup();

	function titleFor(gid: GID): string {
		return titleByGid[gid] ?? '';
	}

	// ── Emit state to listeners ─────────────────────────────────────────────────
	function emitNow() {
		const si = selection.map((id) => order.indexOf(id)).filter((i) => i >= 0);
		const orig = si.map(siToOrig);
		const wordsSel = orig.map((oi) => words[oi]?.text ?? '');

		dispatch('progress', si);
		dispatch('progressDetail', { si, orig, words: wordsSel });

		const solvedByOrig = allIds.map((id) => {
			const idx = allIds.indexOf(id);
			const gid = words[idx]?.groupId as GID;
			return solved.includes(gid);
		});
		const solvedByGroup = (['A', 'B', 'C', 'D'] as const).map((g) => solved.includes(g));

		dispatch('state', {
			order: order.map((id) => allIds.indexOf(id)),
			solvedByOrig,
			solvedByGroup,
			selectedSi: si,
			selectedOrig: orig,
			selectedWords: wordsSel
		});
	}

	// ── Init / Resume ───────────────────────────────────────────────────────────
	async function hydrate() {
		loading = true;
		err = null;
		try {
			if (!puzzle) throw new Error('No puzzle provided');

			if (resumeState?.order?.length === allIds.length) {
				order = resumeState.order.map((orig) => allIds[orig]);
			} else {
				const ids = [...allIds];
				const idxs = shuffled(
					ids.map((_, i) => i),
					initialSeed
				);
				order = idxs.map((i) => ids[i]);
			}

			selection = [];
			foundIds = [];
			solved = [];
			moves = 0;
			completed = false;

			persist = initRunPersistence({
				puzzleId: puzzleKey,
				getState: getRunState,
				applyState: applyRunState
			});
			await persist.load();

			justSolvedIds = [];
			await tick();
			dispatch('loaded', {
				puzzleId: (puzzle?.id ?? puzzleId ?? 'live') as any,
				title: puzzle?.title ?? 'Untitled'
			});
			emitNow();
		} catch (e: any) {
			err = e?.message ?? 'Failed to load';
			dispatch('error', { message: err });
		} finally {
			loading = false;
		}
	}

	onMount(hydrate);

	// ── Actions ────────────────────────────────────────────────────────────────
	function toggleSelect(id: string) {
		if (resolving) return;

		if (selection.includes(id)) {
			selection = selection.filter((x) => x !== id);
			emitNow();
			persistDebounced();
			return;
		}
		if (selection.length >= 4) return;

		selection = [...selection, id];
		moves += 1;

		if (selection.length === 4) {
			checkSelection();
		} else {
			emitNow();
			persistDebounced();
		}
	}

	function clearSelection() {
		if (resolving) return;
		const hadSolved = solved.length > 0;
		selection = [];
		shaking = false;
		dispatch('clear', { clearedSolved: hadSolved });
		emitNow();
		persistDebounced();
	}

	function shuffle() {
		if (resolving) return;

		// Re-shuffle the visual order only
		const ids = [...order];
		const idxs = shuffled(
			ids.map((_, i) => i),
			Math.floor(Math.random() * 100000)
		);
		order = idxs.map((i) => ids[i]);

		// ✅ Do NOT clear selection — keep any in-progress picks
		// Found groups remain locked as before
		shaking = false;
		justSolvedIds = [];

		dispatch('shuffle');
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
			solved = [...new Set([...solved, groupId])];
			justSolvedIds = [...selection];

			if (selection.length === 4) {
				foundIds = [...foundIds, [...selection]];
			}

			const name = titleFor(groupId);
			dispatch('solve', { groupId, name });

			emitNow();
			persistDebounced();

			setTimeout(() => {
				selection = [];
				justSolvedIds = [];
				if (solved.length === 4) {
					dispatch('complete');
					completed = true;
					persistDebounced();
					if (celebrateOnComplete) {
						showRing = true;
						setTimeout(() => (showRing = false), 1600);
					}
				}
				resolving = false;
				emitNow();
				persistDebounced();
			}, RESOLVE_CORRECT_MS);
		} else {
			shaking = true;
			dispatch('wrong');
			moves += 1;
			emitNow();
			persistDebounced();
			setTimeout(() => {
				shaking = false;
				selection = [];
				resolving = false;
				emitNow();
				persistDebounced();
			}, RESOLVE_WRONG_MS);
		}
	}
</script>

<!-- ── Layout ───────────────────────────────────────────────────────────────── -->
<div class="flex w-full flex-col items-center gap-4">
	{#if showBrandEffective}
		<img src={brandSrc} alt="brand" class="mt-2 h-8 opacity-80" />
	{/if}

	{#if showControls}
		<div class="flex items-center justify-center gap-3">
			<button
				class="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[.98]"
				on:click={shuffle}
				aria-label="Shuffle">Shuffle</button
			>

			<button
				class="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[.98]"
				on:click={clearSelection}
				aria-label="Clear">Clear</button
			>
		</div>
	{/if}

	<!-- Grid (applies shake on wrong via class binding) -->
	<div
		class="grid w-full max-w-[680px] grid-cols-4 gap-2 px-3 sm:px-0"
		class:animate-puzzle-shake={shaking}
	>
		{#each order as id (id)}
			{@const w = words.find((w) => w.id === id)}
			{#if w}
				<button
					type="button"
					on:click={() => toggleSelect(id)}
					class="group relative h-full w-full rounded-xl select-none
                 [perspective:1000px] focus:outline-none"
					aria-pressed={selection.includes(id)}
					disabled={resolving || solved.includes(w.groupId)}
					data-locked={solved.includes(w.groupId)}
					data-selected={selection.includes(id)}
					data-word={w.text}
					data-id={id}
					data-group={w.groupId}
				>
					<div
						class="relative h-[70px] w-full transition-transform duration-300
                   [transform-style:preserve-3d] group-data-[locked=true]:[transform:rotateY(180deg)]
                   sm:h-[92px]
                   md:h-[100px]"
					>
						<!-- FRONT -->
						<div class="absolute inset-0 [backface-visibility:hidden]">
							<PuzzleCard
								text={w.text}
								wordId={id}
								selected={selection.includes(id)}
								locked={solved.includes(w.groupId)}
								label={titleFor(w.groupId)}
								disabled={resolving}
							/>
						</div>

						<!-- BACK -->
						<div
							class="absolute inset-0 grid
                     [transform:rotateY(180deg)]
                     place-items-center rounded-xl border
                     border-teal-600 bg-teal-500
                     px-2 text-sm font-semibold
                     text-white [backface-visibility:hidden] sm:text-base"
						>
							{titleFor(w.groupId)}
						</div>
					</div>
				</button>
			{/if}
		{/each}
	</div>

	{#if showRing}
		<div class="mt-4">
			<CompletionRing size={88} />
		</div>
	{/if}

	{#if DEBUG}
		<pre class="mt-4 text-xs text-zinc-500">
{JSON.stringify(
				{
					order,
					selection,
					solved,
					foundIds,
					moves,
					completed,
					shaking,
					resolving,
					titleByGid,
					categories: (puzzle as any)?.categories
				},
				null,
				2
			)}
    </pre>
	{/if}
</div>

<style>
	/* Visuals use Tailwind (including arbitrary properties). No scoped styles needed. */
</style>
