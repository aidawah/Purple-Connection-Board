<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { puzzles as mockPuzzles, type Puzzle } from '$lib/data/puzzles';
  import PuzzleCard from "$lib/components/PuzzleCard.svelte";
  import CustomSelect from '$lib/components/DropdownSelect.svelte';

  const BRAND = '#14b8a6';
  const USE_FIREBASE = false;

  let allPuzzles: Puzzle[] = mockPuzzles;

  let searchTerm = '';
  let selectedCategory = 'All';
  let selectedDifficulty = 'All';

  $: categories = ['All', ...Array.from(new Set(allPuzzles.map(p => p.category)))];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  $: filteredPuzzles = allPuzzles.filter((puzzle) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || puzzle.title.toLowerCase().includes(q) || puzzle.description.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'All' || puzzle.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || puzzle.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy':   return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'Hard':   return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:       return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/30';
    }
  }

  async function loadFromFirebase() {
    if (!browser || !USE_FIREBASE) return;
    const fb = await import('$lib/firebase');
    const ffs = await import('firebase/firestore');
    const db = (fb as any).db || (fb as any).getFirestore?.((fb as any).app);
    if (!db) return;

    try {
      const q = ffs.query(
        ffs.collection(db, 'puzzles'),
        ffs.orderBy('isPinned', 'desc'),
        ffs.orderBy('createdAt', 'desc'),
        ffs.limit(60)
      );
      const snap = await ffs.getDocs(q);
      allPuzzles = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          title: x.title ?? 'Untitled',
          description: x.description ?? '',
          category: x.category ?? 'General',
          difficulty: (x.difficulty ?? 'Medium'),
          solveCount: x.solveCount ?? 0,
          createdBy: x.createdBy ?? 'Unknown',
          imageUrl: x.imageUrl ?? '',
          isPinned: !!x.isPinned,
          createdAt: x.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString()
        } as Puzzle;
      });
    } catch (e) {
      console.error('Failed to load puzzles:', e);
    }
  }

  onMount(() => {
    document.documentElement.style.setProperty('--brand', BRAND);
    loadFromFirebase();
  });
</script>

<svelte:head>
  <title>Browse Puzzles - Purple Connection Board</title>
</svelte:head>

<main class="mx-auto max-w-7xl px-4 pt-10 md:pt-12">
  <!-- Filters card (now with pretty custom selects) -->
  <div class="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm focus-within:ring-1 focus-within:ring-[color:var(--brand)]
              dark:border-zinc-800 dark:bg-zinc-900">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
      <!-- Search -->
      <div class="md:col-span-2">
        <label for="search" class="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Search Puzzles
        </label>
        <input
          id="search"
          type="text"
          bind:value={searchTerm}
          placeholder="Search by title or description..."
          class="w-full rounded-full border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-500
                 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]
                 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
        />
      </div>

      <!-- Category (custom rounded select) -->
      <CustomSelect label="Category" options={categories} bind:value={selectedCategory} />

      <!-- Difficulty (custom rounded select) -->
      <CustomSelect label="Difficulty" options={difficulties} bind:value={selectedDifficulty} />
    </div>

    <!-- Results count -->
    <div class="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Showing {filteredPuzzles.length} of {allPuzzles.length} puzzles
      </p>
    </div>
  </div>

  <!-- Grid (unchanged) -->
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {#each filteredPuzzles as puzzle}
      <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div class="relative flex aspect-video items-center justify-center bg-gradient-to-br from-[color:var(--brand)]/10 to-emerald-200/20 dark:from-[color:var(--brand)]/20 dark:to-emerald-900/10">
          {#if puzzle.imageUrl}
            <img src={puzzle.imageUrl} alt={puzzle.title} class="h-full w-full object-cover" loading="lazy" />
          {/if}
          {#if puzzle.isPinned}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                 class="absolute right-2 top-2 h-5 w-5 rotate-[-20deg] text-[color:var(--brand)] drop-shadow"
                 aria-label="Pinned">
              <circle cx="12" cy="7" r="3"/>
              <rect x="11" y="9.5" width="2" height="7.5" rx="1" />
              <path d="M12 17l-2 5h4l-2-5z"/>
            </svg>
          {/if}
        </div>

        <div class="p-6">
          <div class="mb-3 flex items-start justify-between">
            <h3 class="text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{puzzle.title}</h3>
          </div>

          <p class="mb-4 overflow-hidden text-sm text-zinc-600 [display:-webkit-box] [WebkitLineClamp:2] [WebkitBoxOrient:vertical] dark:text-zinc-400">
            {puzzle.description}
          </p>

          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="rounded px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-[color:var(--brand)]/30 dark:text-zinc-300">
                {puzzle.category}
              </span>
              <span class={`rounded px-2 py-1 text-xs font-medium ${getDifficultyColor(puzzle.difficulty)}`}>
                {puzzle.difficulty}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="text-sm text-zinc-500 dark:text-zinc-400">
              <div>{puzzle.solveCount} solves</div>
              <div>by {puzzle.createdBy}</div>
            </div>
            <a href="/gameboard/{puzzle.id}" sveltekit:prefetch
               class="rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
              Play Puzzle
            </a>
          </div>
        </div>
      </div>
    {/each}
  </div>

  {#if filteredPuzzles.length === 0}
    <div class="py-12 text-center">
      <div class="mb-4 text-6xl">🧩</div>
      <h3 class="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">No puzzles found</h3>
      <p class="mb-4 text-zinc-600 dark:text-zinc-400">Try adjusting your search terms or filters to find more puzzles.</p>
      <button on:click={() => { searchTerm = ''; selectedCategory = 'All'; selectedDifficulty = 'All'; }}
              class="rounded-md border border-[color:var(--brand)]/30 px-4 py-2 text-sm font-medium text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/40">
        Clear Filters
      </button>
    </div>
  {/if}
</main>
