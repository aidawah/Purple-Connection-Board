<script lang="ts">
	import { puzzles, type Puzzle } from '$lib/data/puzzles';

	let searchTerm = '';
	let selectedCategory = 'All';
	let selectedDifficulty = 'All';

	// Get unique categories and difficulties
	const categories = ['All', ...new Set(puzzles.map(p => p.category))];
	const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

	// Filter puzzles based on search and filters
	$: filteredPuzzles = puzzles.filter(puzzle => {
		const matchesSearch = puzzle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			puzzle.description.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory = selectedCategory === 'All' || puzzle.category === selectedCategory;
		const matchesDifficulty = selectedDifficulty === 'All' || puzzle.difficulty === selectedDifficulty;
		
		return matchesSearch && matchesCategory && matchesDifficulty;
	});

	function getDifficultyColor(difficulty: string) {
		switch (difficulty) {
			case 'Easy': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
			case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
			case 'Hard': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
			default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Browse Puzzles - Purple Connection Board</title>
</svelte:head>

<main class="mx-auto max-w-7xl px-4 pt-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">Browse Puzzles</h1>
		<p class="text-lg text-zinc-600 dark:text-zinc-400">Discover and play connection puzzles from our community</p>
	</div>

	<!-- Search and Filters -->
	<div class="mb-8 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<!-- Search -->
			<div class="md:col-span-2">
				<label for="search" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
					Search Puzzles
				</label>
				<input
					id="search"
					type="text"
					bind:value={searchTerm}
					placeholder="Search by title or description..."
					class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
				/>
			</div>

			<!-- Category Filter -->
			<div>
				<label for="category" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
					Category
				</label>
				<select
					id="category"
					bind:value={selectedCategory}
					class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
				>
					{#each categories as category}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</div>

			<!-- Difficulty Filter -->
			<div>
				<label for="difficulty" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
					Difficulty
				</label>
				<select
					id="difficulty"
					bind:value={selectedDifficulty}
					class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
				>
					{#each difficulties as difficulty}
						<option value={difficulty}>{difficulty}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Results Count -->
		<div class="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
			<p class="text-sm text-zinc-600 dark:text-zinc-400">
				Showing {filteredPuzzles.length} of {puzzles.length} puzzles
			</p>
		</div>
	</div>

	<!-- Puzzles Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each filteredPuzzles as puzzle}
			<div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
				<!-- Puzzle Image -->
				<div class="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center relative">
					<img
						src={puzzle.imageUrl}
						alt={puzzle.title}
						class="w-full h-full object-cover"
						loading="lazy"
					/>
					{#if puzzle.isPinned}
						<div class="absolute top-2 right-2 bg-yellow-500 text-white p-1 rounded-full text-xs">
							📌
						</div>
					{/if}
				</div>

				<!-- Puzzle Content -->
				<div class="p-6">
					<div class="flex items-start justify-between mb-3">
						<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
							{puzzle.title}
						</h3>
					</div>

					<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
						{puzzle.description}
					</p>

					<!-- Metadata -->
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center space-x-2">
							<span class="px-2 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded">
								{puzzle.category}
							</span>
							<span class="px-2 py-1 text-xs font-medium rounded {getDifficultyColor(puzzle.difficulty)}">
								{puzzle.difficulty}
							</span>
						</div>
					</div>

					<!-- Stats and Actions -->
					<div class="flex items-center justify-between">
						<div class="text-sm text-zinc-500 dark:text-zinc-400">
							<div>{puzzle.solveCount} solves</div>
							<div>by {puzzle.createdBy}</div>
						</div>
						<a
							href="/puzzle/{puzzle.id}"
							class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors"
						>
							Play Puzzle
						</a>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Empty State -->
	{#if filteredPuzzles.length === 0}
		<div class="text-center py-12">
			<div class="text-6xl mb-4">🧩</div>
			<h3 class="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No puzzles found</h3>
			<p class="text-zinc-600 dark:text-zinc-400 mb-4">
				Try adjusting your search terms or filters to find more puzzles.
			</p>
			<button
				on:click={() => {
					searchTerm = '';
					selectedCategory = 'All';
					selectedDifficulty = 'All';
				}}
				class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors"
			>
				Clear Filters
			</button>
		</div>
	{/if}
</main>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
