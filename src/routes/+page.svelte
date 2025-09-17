<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { app, db } from '$lib/firebase';

  // Firestore
  import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    startAfter,
    onSnapshot,
    where,
    documentId,
    type QueryDocumentSnapshot,
    type DocumentData
  } from 'firebase/firestore';

  const BRAND = '#14b8a6';
  const EXAMPLE_ROUTE = '/gameboard/example'; // TODO: point this to your actual example route

  /** ── UI types ─────────────────────────────────────────────────────────── */
  type FeedItem = {
    id: string; // activity doc id
    type: 'puzzle_created' | 'puzzle_published' | 'completed' | 'comment' | 'puzzle_solved';
    user: string;
    action: string;
    puzzleId: string | null;     // <- needed for linking
    puzzleTitle: string;         // <- will be hydrated from puzzles/{puzzleId} if missing
    timestamp: string;
    avatar?: string;
  };

  type FeaturedPuzzle = {
    id: string;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | string;
    solveCount: number;
    category: string;
    isPinned: boolean;
  };

  /** ── state ────────────────────────────────────────────────────────────── */
  let feedItems: FeedItem[] = [];
  let featuredPuzzles: FeaturedPuzzle[] = [];
  let projectId = '';
  let loadingFeed = false;
  let loadingMore = false;
  let noMore = false;

  let lastFeedDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  const PAGE_SIZE = 10;

  /** ── helpers ─────────────────────────────────────────────────────────── */
  const initials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0]!.toUpperCase())
      .slice(0, 2)
      .join('');

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy':   return 'text-green-600 dark:text-green-400';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'Hard':   return 'text-red-600 dark:text-red-400';
      default:       return 'text-zinc-600 dark:text-zinc-400';
    }
  }

  function icon(type: FeedItem['type']) {
    return type === 'puzzle_created'
      ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a2 2 0 0 1 2 2v1h2.25A1.75 1.75 0 0 1 19 7.75V11h-1.25a1.75 1.75 0 1 0 0 3.5H19v3.75A1.75 1.75 0 0 1 17.25 20H13v-1.25a1.75 1.75 0 1 0-3.5 0V20H6.75A1.75 1.75 0 0 1 5 18.25V14h1.25a1.75 1.75 0 1 0 0-3.5H5V6.75A1.75 1.75 0 0 1 6.75 5H10V4a1 1 0 0 1 1-1h2Z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5Zm4.28 7.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 4.47-4.47a.75.75 0 0 1 1.06 0Z"/></svg>`;
  }

  /** ── mappers ─────────────────────────────────────────────────────────── */
  function mapActivity(d: QueryDocumentSnapshot<DocumentData>): FeedItem {
    const x = d.data() as any;

    const actorObj = x.actor ?? {};
    const userName =
      actorObj.displayName ??
      actorObj.name ??
      actorObj.uid ??
      'Unknown';

    const ts =
      x.createdAt?.toDate?.()?.toLocaleString?.() ??
      x.updatedAt?.toDate?.()?.toLocaleString?.() ??
      'just now';

    const action =
      x.action ??
      (x.type === 'puzzle_solved'
        ? 'solved'
        : x.type === 'puzzle_published'
          ? 'published a puzzle'
          : x.type === 'comment'
            ? 'commented'
            : 'created a new puzzle');

    // Prefer embedded puzzleTitle; otherwise we’ll hydrate from puzzles/{puzzleId}
    const puzzleId: string | null = x.puzzleId ?? null;
    const puzzleTitleFromDoc =
      x.puzzleTitle ??
      x.puzzle?.title ??
      (typeof puzzleId === 'string' && puzzleId.startsWith('pz_') ? '' : puzzleId ?? '');

    return {
      id: d.id,
      type: (x.type ?? 'puzzle_created') as FeedItem['type'],
      user: userName,
      action,
      puzzleId,
      puzzleTitle: puzzleTitleFromDoc || '', // blank => needs hydration
      timestamp: ts,
      avatar: initials(userName)
    };
  }

  function mapPuzzle(d: QueryDocumentSnapshot<DocumentData>): FeaturedPuzzle {
    const x = d.data() as any;
    const toTitle = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
    return {
      id: d.id,
      title: x.title ?? 'Untitled',
      difficulty: toTitle((x.difficulty ?? 'Medium').toString()),
      solveCount: x.solveCount ?? 0,
      category: x.category ?? 'General',
      isPinned: !!x.isPinned
    };
  }

  /** ── batch join: hydrate missing puzzle titles from puzzles/{id} ───────── */
  async function hydrateTitles(items: FeedItem[]) {
    // Find activities that need a title and have a puzzleId
    const needing = items
      .filter(i => i.puzzleId && !i.puzzleTitle)
      .map(i => i.puzzleId!) as string[];

    if (needing.length === 0) return;

    // chunk in batches of 10 for 'in' queries
    const chunk = <T,>(arr: T[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, k) => arr.slice(k * size, k * size + size));

    const chunks = chunk(needing, 10);
    const titleMap = new Map<string, string>();

    for (const ids of chunks) {
      const qRef = query(
        collection(db, 'puzzles'),
        where(documentId(), 'in', ids)
      );
      const snap = await getDocs(qRef);
      snap.forEach(docSnap => {
        const data = docSnap.data() as any;
        const title = data?.title ?? 'Untitled';
        titleMap.set(docSnap.id, title);
      });
    }

    // apply titles in-place
    for (const it of items) {
      if (it.puzzleId && !it.puzzleTitle) {
        const t = titleMap.get(it.puzzleId);
        if (t) it.puzzleTitle = t;
      }
      // if still blank, show a safe fallback
      if (!it.puzzleTitle) it.puzzleTitle = 'Untitled';
    }
  }

  /** ── loaders ─────────────────────────────────────────────────────────── */
  let unsubRecent: () => void;

  async function loadInitial() {
    if (!browser) return;
    projectId = app?.options?.projectId ?? '';
    document.documentElement.style.setProperty('--brand', BRAND);

    // Featured
    try {
      const puzzlesQ = query(
        collection(db, 'puzzles'),
        orderBy('isPinned', 'desc'),
        orderBy('createdAt', 'desc'),
        limit(12)
      );
      const snap = await getDocs(puzzlesQ);
      featuredPuzzles = snap.docs.map(mapPuzzle);
    } catch (e) {
      console.warn('Featured load failed:', e);
      featuredPuzzles = [];
    }

    // First page
    await loadMoreActivity(true);

    // Live listener (top PAGE_SIZE, newest first); hydrate titles for live slice too
    const liveQ = query(
      collection(db, 'activity'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
    unsubRecent = onSnapshot(liveQ, async (snap) => {
      const fresh = snap.docs.map(mapActivity);
      await hydrateTitles(fresh);

      // merge & de-dup by activity id, keep newest-first
      const seen = new Set<string>();
      const merged = [...fresh, ...feedItems].filter((it) => {
        if (seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });
      feedItems = merged;
    }, (err) => {
      console.warn('Live feed listener failed:', err);
    });
  }

  async function loadMoreActivity(initial = false) {
    if (loadingMore || loadingFeed || noMore) return;
    loadingMore = !initial;
    loadingFeed = initial;

    try {
      let qRef = query(
        collection(db, 'activity'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
      if (lastFeedDoc && !initial) {
        qRef = query(
          collection(db, 'activity'),
          orderBy('createdAt', 'desc'),
          startAfter(lastFeedDoc),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(qRef);
      if (snap.empty) {
        if (initial) feedItems = [];
        noMore = true;
        return;
      }

      const items = snap.docs.map(mapActivity);
      await hydrateTitles(items); // <- join titles here

      if (initial) {
        feedItems = items;
      } else {
        const existing = new Set(feedItems.map((x) => x.id));
        feedItems = [...feedItems, ...items.filter((x) => !existing.has(x.id))];
      }

      lastFeedDoc = snap.docs[snap.docs.length - 1] ?? lastFeedDoc;
      if (snap.size < PAGE_SIZE) noMore = true;
    } catch (e) {
      console.warn('Activity load failed:', e);
    } finally {
      loadingMore = false;
      loadingFeed = false;
    }
  }

  onMount(loadInitial);
  onDestroy(() => unsubRecent?.());
</script>

<svelte:head>
  <title>Purple Connection Board</title>
</svelte:head>

<main class="mx-auto max-w-7xl px-4 pt-10 md:pt-12">
  {#if projectId}
    <div class="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
      project: <code>{projectId}</code>
      · activity: <code>{feedItems.length}</code>
      · featured: <code>{featuredPuzzles.length}</code>
    </div>
  {/if}

  <section class="mb-8 text-center">
    <div class="mx-auto mb-4 h-1 w-24 rounded-full [background:color:var(--brand)]/70 dark:[background:color:var(--brand)]/60"></div>
    <h1 class="mb-3 text-3xl font-extrabold tracking-tight md:text-5xl">
      <span class="bg-gradient-to-r from-[color:var(--brand)] via-[color:var(--brand)] to-emerald-500 bg-clip-text text-transparent">
        Purple Connection Board
      </span>
    </h1>
    <p class="text-lg text-zinc-600 dark:text-zinc-400">Connect, Create, and Challenge Your Mind!</p>
  </section>

  <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
    <!-- Feed -->
    <div class="lg:col-span-2">
      <div class="rounded-xl border border-zinc-200 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div class="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Recent Activity</h2>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">See what’s happening in the community</p>
        </div>

        {#if loadingFeed}
          <div class="p-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
        {:else if feedItems.length === 0}
          <div class="p-6 text-sm text-zinc-500 dark:text-zinc-400">No recent activity yet.</div>
        {:else}
          <div class="divide-y divide-zinc-200 dark:divide-zinc-800">
            {#each feedItems as item}
              <div class="p-6 transition-colors hover:bg-[color:var(--brand)]/5 dark:hover:bg-[color:var(--brand)]/10">
                <div class="flex items-start gap-4">
                  <!-- Avatar -->
                  <div class="flex-shrink-0">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--brand)] to-emerald-500 text-sm font-semibold text-white ring-1 ring-white/40 dark:ring-0">
                      {item.avatar}
                    </div>
                  </div>

                  <!-- Content -->
                  <div class="min-w-0 flex-1">
                    <div class="mb-2 flex items-center gap-2">
                      <span class="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                        {@html icon(item.type)}
                      </span>
                      <span class="font-medium text-zinc-900 dark:text-zinc-100">{item.user}</span>
                      <span class="text-zinc-600 dark:text-zinc-400">{item.action}</span>
                    </div>

                    <div class="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
                      <h3 class="font-medium text-zinc-900 dark:text-zinc-100">{item.puzzleTitle}</h3>
                    </div>

                    <div class="mt-2 flex items-center justify-between">
                      <span class="text-sm text-zinc-500 dark:text-zinc-400">{item.timestamp}</span>
                      {#if item.puzzleId}
                        <a
                          href={`/gameboard/${item.puzzleId}`}
                          class="text-sm font-medium text-[color:var(--brand)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 dark:text-teal-300">
                          View Puzzle
                        </a>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="border-t border-zinc-200 p-6 text-center dark:border-zinc-800">
          <button
            class="rounded-md border border-[color:var(--brand)]/30 px-4 py-2 text-sm font-medium text-[color:var(--brand)] transition-colors hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 disabled:opacity-50"
            on:click={() => loadMoreActivity()}
            disabled={loadingMore || noMore}
          >
            {#if noMore}
              No more activity
            {:else if loadingMore}
              Loading…
            {:else}
              Load More Activity
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Featured / Pinned -->
    <div class="lg:col-span-1">
      <div class="sticky top-20 rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div class="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Featured Puzzles</h2>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Popular and pinned challenges</p>
          
        </div>

        <div class="space-y-4 p-6">
          {#if featuredPuzzles.length === 0}
            <div class="text-sm text-zinc-500 dark:text-zinc-400">No featured puzzles yet.</div>
          {:else}
            {#each featuredPuzzles as puzzle}
              <div class="cursor-pointer rounded-lg border border-zinc-200 p-4 transition-colors hover:border-[color:var(--brand)]/50 hover:bg-[color:var(--brand)]/5 dark:border-zinc-800 dark:hover:bg-[color:var(--brand)]/10">
                <div class="mb-2 flex items-start justify-between">
                  <h3 class="text-sm font-medium leading-tight text-zinc-900 dark:text-zinc-100">{puzzle.title}</h3>
                  {#if puzzle.isPinned}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4 text-[#14b8a6] rotate-[-20deg]" aria-label="Pinned">
                      <circle cx="12" cy="6" r="3" />
                      <rect x="11" y="9" width="2" height="8" rx="1" />
                      <path d="M12 17l-2 5h4l-2-5z" />
                    </svg>
                  {/if}
                </div>

                <div class="mb-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                  <span class="rounded px-2 py-1 ring-1 ring-inset ring-[color:var(--brand)]/30">{puzzle.category}</span>
                  <span class="{getDifficultyColor(puzzle.difficulty)} font-medium">{puzzle.difficulty}</span>
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-xs text-zinc-500 dark:text-zinc-400">{puzzle.solveCount} solves</span>
                  <a href={`/gameboard/${puzzle.id}`} class="text-xs font-medium text-[color:var(--brand)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
                    Play →
                  </a>
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <div class="border-t border-zinc-200 p-6 dark:border-zinc-800">
          <a href="/browse" class="block w-full rounded-md bg-[color:var(--brand)] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
            Browse All Puzzles
          </a>
        </div>
        <!-- Example Game Box -->
<div class="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
  <div class="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
    <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Example Game</h2>
    <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Try our demo puzzle to learn how it works</p>
  </div>

  <div class="p-6">
    <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
      This is a sample puzzle available anytime. Click below to explore the game board.
    </p>

    <a
      href="gameboard/example"
      class="block w-full rounded-md bg-[color:var(--brand)] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40"
    >
      Play Example Game
    </a>
  </div>
</div>

      </div>
    </div>
  </div>
</main>
