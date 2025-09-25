<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { app, db, fetchPublishedPuzzlesPage, type FeedPuzzle } from '$lib/firebase';
  import PuzzlePreview from '$lib/components/PuzzlePreview.svelte';
  import PinFeaturedButton from '$lib/components/PinFeaturedButton.svelte'; // + added
  import { getAuth, onAuthStateChanged } from 'firebase/auth'; // + added

  import {
    collection, query, orderBy, limit, getDocs, startAfter, onSnapshot,
    where, documentId, type QueryDocumentSnapshot, type DocumentData
  } from 'firebase/firestore';

  const BRAND = '#14b8a6';

  type FeedItem = {
    id: string;
    type: 'puzzle_created' | 'puzzle_published' | 'completed' | 'comment' | 'puzzle_solved';
    user: string;
    action: string;
    puzzleId: string | null;
    puzzleTitle: string;
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

  let feedItems: FeedItem[] = [];
  let featuredPuzzles: FeaturedPuzzle[] = [];
  let projectId = '';
  let loadingFeed = false;
  let loadingMore = false;
  let noMore = false;
  let lastFeedDoc: QueryDocumentSnapshot<DocumentData> | null = null;
  const PAGE_SIZE = 10;

  let latestPuzzles: FeedPuzzle[] = [];
  let loadingLatest = true;
  let loadingMoreLatest = false;
  let hasMoreLatest = false;
  let lastLatestDoc: QueryDocumentSnapshot<DocumentData> | undefined;




  const initials = (name: string) =>
    (name || 'Anonymous')
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0]!.toUpperCase())
      .slice(0, 2)
      .join('');

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600 dark:text-green-400';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Hard':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-zinc-600 dark:text-zinc-400';
    }
  }

  function icon(type: FeedItem['type']) {
    return type === 'puzzle_created'
      ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a2 2 0 0 1 2 2v1h2.25A1.75 1.75 0 0 1 19 7.75V11h-1.25a1.75 1.75 0 1 0 0 3.5H19v3.75A1.75 1.75 0 0 1 17.25 20H13v-1.25a1.75 1.75 0 1 0-3.5 0V20H6.75A1.75 1.75 0 0 1 5 18.25V14h1.25a1.75 1.75 0 1 0 0-3.5H5V6.75A1.75 1.75 0 0 1 6.75 5H10V4a1 1 0 0 1 1-1h2Z"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5Zm4.28 7.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 4.47-4.47a.75.75 0 0 1 1.06 0Z"/></svg>`;
  }

  const fmt = (ts: any) => {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString();
    } catch { return ''; }
  };

  function mapActivity(d: QueryDocumentSnapshot<DocumentData>): FeedItem {
    const x = d.data() as any;

    const actorObj = x.actor ?? {};
    const userName = actorObj.displayName ?? actorObj.name ?? actorObj.uid ?? 'Unknown';

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

    const puzzleId: string | null = x.puzzleId ?? null;
    const puzzleTitleFromDoc =
      x.puzzleTitle ?? x.puzzle?.title ?? (typeof puzzleId === 'string' && puzzleId.startsWith('pz_') ? '' : puzzleId ?? '');

    return {
      id: d.id,
      type: (x.type ?? 'puzzle_created') as FeedItem['type'],
      user: userName,
      action,
      puzzleId,
      puzzleTitle: puzzleTitleFromDoc || '',
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
      isPinned: !!(x.isPinned ?? x.featured)
    };
  }

  async function hydrateTitles(items: FeedItem[]) {
    const needing = items.filter(i => i.puzzleId && !i.puzzleTitle).map(i => i.puzzleId!) as string[];
    if (needing.length === 0) return;

    const chunk = <T,>(arr: T[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, k) => arr.slice(k * size, k * size + size));

    const chunks = chunk(needing, 10);
    const titleMap = new Map<string, string>();

    for (const ids of chunks) {
      const qRef = query(collection(db, 'puzzles'), where(documentId(), 'in', ids));
      const snap = await getDocs(qRef);
      snap.forEach(docSnap => {
        const data = docSnap.data() as any;
        const title = data?.title ?? 'Untitled';
        titleMap.set(docSnap.id, title);
      });
    }
    for (const it of items) {
      if (it.puzzleId && !it.puzzleTitle) {
        const t = titleMap.get(it.puzzleId);
        if (t) it.puzzleTitle = t;
      }
      if (!it.puzzleTitle) it.puzzleTitle = 'Untitled';
    }
  }

  let unsubRecent: () => void;
  let unsubFeatured: () => void;
  let unsubAuth: () => void;                 
  let canPin = false;                       

  async function loadInitial() {
    if (!browser) return;
    projectId = app?.options?.projectId ?? '';
    document.documentElement.style.setProperty('--brand', BRAND);

    // Auth domain gate for pin button
const auth = getAuth(app);
unsubAuth = onAuthStateChanged(auth, (u) => {
  canPin = !!u?.email?.toLowerCase?.().endsWith('@healthspaces.com');
});


    // Featured (sidebar) — show featured:true; newest featuredAt first (fallback sorts in-memory)
    try {
      const qFeatured = query(
        collection(db, 'puzzles'),
        where('featured', '==', true),
        orderBy('featuredAt', 'desc'),
        limit(12)
      );
      unsubFeatured = onSnapshot(qFeatured, (snap) => {
        const docsSorted = snap.docs.slice().sort((a, b) => {
          const ax: any = a.data(), bx: any = b.data();
          const at =
            (ax?.featuredAt?.toMillis?.() ?? ax?.featuredAt?.seconds * 1000 ?? 0) ||
            (ax?.createdAt?.toMillis?.() ?? ax?.createdAt?.seconds * 1000 ?? 0);
          const bt =
            (bx?.featuredAt?.toMillis?.() ?? bx?.featuredAt?.seconds * 1000 ?? 0) ||
            (bx?.createdAt?.toMillis?.() ?? bx?.createdAt?.seconds * 1000 ?? 0);
          return bt - at;
        });
        featuredPuzzles = docsSorted.map(mapPuzzle);
      });
    } catch (e) {
      const qPinned = query(collection(db, 'puzzles'), where('isPinned', '==', true), limit(20));
      unsubFeatured = onSnapshot(qPinned, (snap3) => {
        const docsSorted = snap3.docs.slice().sort((a, b) => {
          const ax: any = a.data(), bx: any = b.data();
          const at = ax?.createdAt?.toMillis?.() ?? ax?.createdAt?.seconds * 1000 ?? 0;
          const bt = bx?.createdAt?.toMillis?.() ?? bx?.createdAt?.seconds * 1000 ?? 0;
          return bt - at;
        });
        featuredPuzzles = docsSorted.map(mapPuzzle);
      });
    }

    // Published feed
    await loadInitialLatestPuzzles();

    // Activity list (separate from the published feed)
    await loadMoreActivity(true);

    // Live activity listener
    const liveQ = query(collection(db, 'activity'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    unsubRecent = onSnapshot(liveQ, async (snap) => {
      const fresh = snap.docs.map(mapActivity);
      await hydrateTitles(fresh);
      const seen = new Set<string>();
      const merged = [...fresh, ...feedItems].filter((it) => {
        if (seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });
      feedItems = merged;
    });
  }

  async function loadMoreActivity(initial = false) {
    if (loadingMore || loadingFeed || noMore) return;
    loadingMore = !initial;
    loadingFeed = initial;

    try {
      let qRef = query(collection(db, 'activity'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
      if (lastFeedDoc && !initial) {
        qRef = query(collection(db, 'activity'), orderBy('createdAt', 'desc'), startAfter(lastFeedDoc), limit(PAGE_SIZE));
      }

      const snap = await getDocs(qRef);
      if (snap.empty) { if (initial) feedItems = []; noMore = true; return; }

      const items = snap.docs.map(mapActivity);
      await hydrateTitles(items);

      if (initial) {
        feedItems = items;
      } else {
        const existing = new Set(feedItems.map((x) => x.id));
        feedItems = [...feedItems, ...items.filter((x) => !existing.has(x.id))];
      }

      lastFeedDoc = snap.docs[snap.docs.length - 1] ?? lastFeedDoc;
      if (snap.size < PAGE_SIZE) noMore = true;
    } finally {
      loadingMore = false;
      loadingFeed = false;
    }
  }

  // Published feed loaders
  async function loadInitialLatestPuzzles() {
    loadingLatest = true;
    const { items, lastDoc, hasMore } = await fetchPublishedPuzzlesPage(5);
    latestPuzzles = items;
    lastLatestDoc = lastDoc;
    hasMoreLatest = hasMore;
    loadingLatest = false;
  }

  async function loadMoreLatestPuzzles() {
    if (!hasMoreLatest || loadingMoreLatest) return;
    loadingMoreLatest = true;
    const { items, lastDoc, hasMore } = await fetchPublishedPuzzlesPage(5, lastLatestDoc);
    latestPuzzles = [...latestPuzzles, ...items];
    lastLatestDoc = lastDoc;
    hasMoreLatest = hasMore;
    loadingMoreLatest = false;
  }

  onMount(loadInitial);
  onDestroy(() => { unsubRecent?.(); unsubFeatured?.(); unsubAuth?.(); });
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
    <!-- Recent Activity -->
    <div class="lg:col-span-2">
      <div class="rounded-xl border border-zinc-200 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div class="border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
          <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Recent Activity</h2>
          <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Newest published puzzles first</p>
        </div>

        <!-- Latest published puzzles (inside Recent Activity) -->
        <div class="px-6 pt-5 pb-2">
          {#if loadingLatest}
            <div class="mt-3 space-y-3">
              {#each Array(2) as _}
                <div class="animate-pulse h-16 rounded-lg bg-gray-100 dark:bg-zinc-800"></div>
              {/each}
            </div>
          {:else if latestPuzzles.length === 0}
            <div class="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No new publications yet.</div>
          {:else}
            <ul class="mt-3 space-y-3">
              {#each latestPuzzles as p}
                <li class="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div class="flex items-start gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--brand)] to-emerald-500 text-xs font-semibold text-white">
                      {initials((p as any)?.author?.name ?? 'Anonymous')}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-zinc-900 dark:text-zinc-100">{(p as any)?.author?.name ?? 'Anonymous'}</span>
                        <span class="text-zinc-600 dark:text-zinc-400">published a puzzle</span>
                      </div>
                      <div class="mt-1 rounded border border-zinc-200 bg-zinc-50 p-2 text-sm dark:border-zinc-800 dark:bg-zinc-800">
                        <div class="flex items-center justify-between gap-3">
                          <span class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{p.title}</span>
                          <time class="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{fmt(p.publishedAt)}</time>
                        </div>
                        {#if p.summary}
                          <p class="mt-1 line-clamp-2 text-zinc-600 dark:text-zinc-400">{p.summary}</p>
                        {/if}
                      </div>
                      <div class="mt-2 flex items-center justify-between">
                        <div class="text-xs text-zinc-500 dark:text-zinc-400">🧩 New puzzle</div>
                        <a
                          href={`/gameboard/${p.id}`}
                          class="text-xs font-medium text-[color:var(--brand)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
                          Play →
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              {/each}
            </ul>

            <div class="mt-3 flex justify-center">
              {#if hasMoreLatest}
                <button
                  on:click={loadMoreLatestPuzzles}
                  class="px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm disabled:opacity-50"
                  disabled={loadingMoreLatest}
                >
                  {#if loadingMoreLatest}Loading…{/if}
                  {#if !loadingMoreLatest}Show 5 more{/if}
                </button>
              {:else}
                <div class="text-xs text-zinc-500 dark:text-zinc-400">No more new puzzles.</div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="border-t border-dashed border-zinc-200 dark:border-zinc-800"></div>

        <div class="border-t border-zinc-200 p-6 text-center dark:border-zinc-800">
          <button
            class="rounded-md border border-[color:var(--brand)]/30 px-4 py-2 text-sm font-medium text-[color:var(--brand)] transition-colors hover:bg-[color:var(--brand)]/10 focus:ring-2 focus:ring-[color:var(--brand)]/40 focus:outline-none disabled:opacity-50"
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
              <div class="cursor-pointer rounded-lg border border-zinc-200 transition hover:border-[color:var(--brand)]/50 hover:bg-[color:var(--brand)]/5 dark:border-zinc-800 dark:hover:bg-[color:var(--brand)]/10">
<div class="relative">
  <PuzzlePreview puzzleId={puzzle.id} />

  {#if puzzle.isPinned}
    <svg
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="currentColor"
      class="absolute top-2 right-2 h-4 w-4 rotate-[-20deg] text-[var(--brand)] drop-shadow"
      aria-label="Pinned"
    >
      <circle cx="12" cy="6" r="3" />
      <rect x="11" y="9" width="2" height="8" rx="1" />
      <path d="M12 17l-2 5h4l-2-5z" />
    </svg>
  {/if}

  {#if canPin}
    <PinFeaturedButton puzzleId={puzzle.id} bind:pinned={puzzle.isPinned} />
  {/if}
</div>


                <div class="p-4">
                  <div class="mb-2 flex items-start justify-between">
                    <h3 class="text-sm font-medium leading-tight text-zinc-900 dark:text-zinc-100 truncate">{puzzle.title}</h3>
                  </div>

                  <div class="mb-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                    <span class="rounded px-2 py-1 ring-1 ring-[color:var(--brand)]/30 ring-inset">{puzzle.category}</span>
                    <span class="{getDifficultyColor(puzzle.difficulty)} font-medium">{puzzle.difficulty}</span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-xs text-zinc-500 dark:text-zinc-400">{puzzle.solveCount} solves</span>
                    <a
                      href={`/gameboard/${puzzle.id}`}
                      class="text-xs font-medium text-[color:var(--brand)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
                      Play →
                    </a>
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>

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
              class="block w-full rounded-md bg-[color:var(--brand)] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
              Play Example Game
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>
