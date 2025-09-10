<script lang="ts">
  import Footer from '$lib/components/Footer.svelte';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  // ---- brand color (swap to exact hex from your logo if different) ----
  const BRAND = '#14b8a6';

  // ---- Firebase toggle: set to true when you're ready to fetch real data ----
  const USE_FIREBASE = false;

  // ---- types ----
  type FeedItem = {
    id: string;
    type: 'puzzle_created' | 'puzzle_solved';
    user: string;
    action: string;
    puzzleTitle: string;
    timestamp: string; // or number/Date if you prefer
    avatar?: string;
  };

  type FeaturedPuzzle = {
    id: string;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    solveCount: number;
    category: string;
    isPinned: boolean;
  };

  // ---- mock data (used while USE_FIREBASE = false) ----
  let feedItems: FeedItem[] = [
    { id: '1', type: 'puzzle_created', user: 'Alice Johnson', action: 'created a new puzzle', puzzleTitle: 'Tech Giants Connection', timestamp: '2 hours ago', avatar: 'AJ' },
    { id: '2', type: 'puzzle_solved',   user: 'Bob Smith',    action: 'solved',                puzzleTitle: 'Movie Directors',       timestamp: '4 hours ago', avatar: 'BS' },
    { id: '3', type: 'puzzle_created',  user: 'Carol Davis',  action: 'created a new puzzle', puzzleTitle: 'World Capitals',        timestamp: '6 hours ago', avatar: 'CD' },
    { id: '4', type: 'puzzle_solved',   user: 'David Wilson', action: 'solved',                puzzleTitle: 'Programming Languages', timestamp: '8 hours ago', avatar: 'DW' },
    { id: '5', type: 'puzzle_created',  user: 'Emma Brown',   action: 'created a new puzzle', puzzleTitle: 'Ancient Civilizations',  timestamp: '12 hours ago', avatar: 'EB' }
  ];

  let featuredPuzzles: FeaturedPuzzle[] = [
    { id: '1', title: 'Daily Challenge: Sports Teams', difficulty: 'Medium', solveCount: 1247, category: 'Sports',        isPinned: true  },
    { id: '2', title: 'Classic Literature Characters', difficulty: 'Hard',   solveCount: 892,  category: 'Literature',    isPinned: true  },
    { id: '3', title: 'Popular TV Shows',               difficulty: 'Easy',   solveCount: 2156, category: 'Entertainment', isPinned: false },
    { id: '4', title: 'Chemical Elements',              difficulty: 'Hard',   solveCount: 634,  category: 'Science',       isPinned: false }
  ];

  // ---- difficulty color ----
  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy':   return 'text-green-600 dark:text-green-400';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'Hard':   return 'text-red-600 dark:text-red-400';
      default:       return 'text-zinc-600 dark:text-zinc-400';
    }
  }

  // ---- activity icon (teal SVGs) ----
  // we use inline SVG so we can color with currentColor (teal)
  const ICON_CLASSES = 'h-5 w-5 text-[color:var(--brand)]';
  function ActivityIcon({ type }: { type: FeedItem['type'] }) {
    return type === 'puzzle_created'
      ? /* puzzle piece */ `
        <svg xmlns="http://www.w3.org/2000/svg" class="${ICON_CLASSES}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13 3a2 2 0 0 1 2 2v1h2.25a1.75 1.75 0 0 1 1.75 1.75V11h-1.25a1.75 1.75 0 1 0 0 3.5H19v3.75A1.75 1.75 0 0 1 17.25 20H13v-1.25a1.75 1.75 0 1 0-3.5 0V20H6.75A1.75 1.75 0 0 1 5 18.25V14h1.25a1.75 1.75 0 1 0 0-3.5H5V6.75A1.75 1.75 0 0 1 6.75 5H10V4a1 1 0 0 1 1-1h2Z"/>
        </svg>`
      : /* check circle */ `
        <svg xmlns="http://www.w3.org/2000/svg" class="${ICON_CLASSES}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5Zm4.28 7.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 4.47-4.47a.75.75 0 0 1 1.06 0Z"/>
        </svg>`;
  }

  // ---- Firebase loaders (safe to enable later) ----
  async function loadFromFirebase() {
    if (!browser || !USE_FIREBASE) return;

    // lazy imports to avoid SSR issues
    const fb = await import('$lib/firebase');
    const ffs = await import('firebase/firestore');

    // expect `db` to be exported from $lib/firebase
    const db = (fb as any).db || (fb as any).getFirestore?.((fb as any).app);
    if (!db) return;

    // FEED: /activity ordered by createdAt desc
    try {
      const feedQ = ffs.query(
        ffs.collection(db, 'activity'),
        ffs.orderBy('createdAt', 'desc'),
        ffs.limit(20)
      );
      const snap = await ffs.getDocs(feedQ);
      feedItems = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          type: x.type ?? 'puzzle_created',
          user: x.user ?? 'Unknown',
          action: x.action ?? (x.type === 'puzzle_solved' ? 'solved' : 'created a new puzzle'),
          puzzleTitle: x.puzzleTitle ?? 'Untitled',
          timestamp: x.createdAt?.toDate?.()?.toLocaleString?.() ?? 'just now',
          avatar: x.avatar ?? (x.user ? x.user.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() : 'U')
        } as FeedItem;
      });
    } catch (e) {
      console.error('Failed to load feed:', e);
    }

    // FEATURED: /puzzles where isPinned==true, fallback sort by solves desc
    try {
      const featQ = ffs.query(
        ffs.collection(db, 'puzzles'),
        ffs.orderBy('isPinned', 'desc'),
        ffs.orderBy('solveCount', 'desc'),
        ffs.limit(12)
      );
      const snap = await ffs.getDocs(featQ);
      featuredPuzzles = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          title: x.title ?? 'Untitled',
          difficulty: (x.difficulty ?? 'Medium') as FeaturedPuzzle['difficulty'],
          solveCount: x.solveCount ?? 0,
          category: x.category ?? 'General',
          isPinned: !!x.isPinned
        } as FeaturedPuzzle;
      });
    } catch (e) {
      console.error('Failed to load featured puzzles:', e);
    }
  }

  onMount(() => {
    // brand color for inline SVGs using currentColor
    document.documentElement.style.setProperty('--brand', BRAND);
    loadFromFirebase();
  });
</script>

<!-- Header -->
<main class="mx-auto max-w-7xl px-4 pt-10 md:pt-12">
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
                    <!-- teal activity icon -->
                    <span class="flex h-5 w-5 items-center justify-center text-[color:var(--brand)]" aria-hidden="true">
                      {@html ActivityIcon({ type: item.type })}
                    </span>
                    <span class="font-medium text-zinc-900 dark:text-zinc-100">{item.user}</span>
                    <span class="text-zinc-600 dark:text-zinc-400">{item.action}</span>
                  </div>

                  <div class="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
                    <h3 class="font-medium text-zinc-900 dark:text-zinc-100">{item.puzzleTitle}</h3>
                  </div>

                  <div class="mt-2 flex items-center justify-between">
                    <span class="text-sm text-zinc-500 dark:text-zinc-400">{item.timestamp}</span>
                    <button class="text-sm font-medium text-[color:var(--brand)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 dark:text-teal-300">
                      View Puzzle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <div class="border-t border-zinc-200 p-6 text-center dark:border-zinc-800">
          <button class="rounded-md border border-[color:var(--brand)]/30 px-4 py-2 text-sm font-medium text-[color:var(--brand)] transition-colors hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 dark:text-teal-300">
            Load More Activity
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
          {#each featuredPuzzles as puzzle}
            <div class="cursor-pointer rounded-lg border border-zinc-200 p-4 transition-colors hover:border-[color:var(--brand)]/50 hover:bg-[color:var(--brand)]/5 dark:border-zinc-800 dark:hover:bg-[color:var(--brand)]/10">
              <div class="mb-2 flex items-start justify-between">
                <h3 class="text-sm font-medium leading-tight text-zinc-900 dark:text-zinc-100">{puzzle.title}</h3>
{#if puzzle.isPinned}
  <svg xmlns="http://www.w3.org/2000/svg"
       viewBox="0 0 24 24"
       fill="currentColor"
       class="h-4 w-4 text-[#14b8a6] rotate-[-20deg]"
       aria-label="Pinned">
    <!-- pin head -->
    <circle cx="12" cy="6" r="3"/>
    <!-- pin body angled -->
    <rect x="11" y="9" width="2" height="8" rx="1" />
    <!-- sharp point -->
    <path d="M12 17l-2 5h4l-2-5z"/>
  </svg>
{/if}




              </div>

              <div class="mb-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span class="rounded px-2 py-1 ring-1 ring-inset ring-[color:var(--brand)]/30">{puzzle.category}</span>
                <span class="{getDifficultyColor(puzzle.difficulty)} font-medium">{puzzle.difficulty}</span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-xs text-zinc-500 dark:text-zinc-400">{puzzle.solveCount} solves</span>
                <button class="text-xs font-medium text-[color:var(--brand)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40 dark:text-teal-300">
                  Play →
                </button>
              </div>
            </div>
          {/each}
        </div>

        <div class="border-t border-zinc-200 p-6 dark:border-zinc-800">
          <button class="w-full rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
            Browse All Puzzles
          </button>
        </div>
      </div>
    </div>
  </div>
</main>
