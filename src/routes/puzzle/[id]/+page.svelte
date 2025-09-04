<script lang="ts">
	import { page } from '$app/stores';
	import { getPuzzleById, type Puzzle } from '$lib/data/puzzles';
	import { onMount } from 'svelte';

	let puzzle: Puzzle | undefined;
	let selectedWords: string[] = [];
	let solvedGroups: { name: string; words: string[]; color: string }[] = [];
	let mistakes = 0;
	let maxMistakes = 4;
	let gameComplete = false;
	let showSolution = false;
	let shuffledWords: string[] = [];

	$: puzzleId = parseInt($page.params.id);

	onMount(() => {
		puzzle = getPuzzleById(puzzleId);
		if (puzzle) {
			// Shuffle all words for the game
			shuffledWords = puzzle.words.flat().sort(() => Math.random() - 0.5);
		}
	});

	function toggleWordSelection(word: string) {
		if (selectedWords.includes(word)) {
			selectedWords = selectedWords.filter(w => w !== word);
		} else if (selectedWords.length < 4) {
			selectedWords = [...selectedWords, word];
		}
	}

	function submitGuess() {
		if (selectedWords.length !== 4 || !puzzle) return;

		// Check if the selected words form a correct group
		const correctGroup = puzzle.solution.groups.find(group => 
			group.words.every(word => selectedWords.includes(word)) &&
			selectedWords.every(word => group.words.includes(word))
		);

		if (correctGroup) {
			// Correct guess
			solvedGroups = [...solvedGroups, correctGroup];
			shuffledWords = shuffledWords.filter(word => !selectedWords.includes(word));
			selectedWords = [];

			// Check if game is complete
			if (solvedGroups.length === puzzle.solution.groups.length) {
				gameComplete = true;
			}
		} else {
			// Incorrect guess
			mistakes++;
			selectedWords = [];

			if (mistakes >= maxMistakes) {
				showSolution = true;
				gameComplete = true;
			}
		}
	}

	function resetGame() {
		if (!puzzle) return;
		selectedWords = [];
		solvedGroups = [];
		mistakes = 0;
		gameComplete = false;
		showSolution = false;
		shuffledWords = puzzle.words.flat().sort(() => Math.random() - 0.5);
	}

	function getDifficultyColor(difficulty: string) {
		switch (difficulty) {
			case 'Easy': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
			case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
			case 'Hard': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
			default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
		}
	}

	function isWordSolved(word: string): boolean {
		return solvedGroups.some(group => group.words.includes(word));
	}
</script>

<svelte:head>
	<title>{puzzle?.title || 'Puzzle'} - Purple Connection Board</title>
</svelte:head>

{#if puzzle}
	<main class="mx-auto max-w-4xl px-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
				<a href="/" class="hover:text-purple-600 dark:hover:text-purple-400">Home</a>
				<span>→</span>
				<a href="/browse" class="hover:text-purple-600 dark:hover:text-purple-400">Browse</a>
				<span>→</span>
				<span>{puzzle.title}</span>
			</div>

			<div class="flex items-start justify-between mb-4">
				<div>
					<h1 class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
						{puzzle.title}
					</h1>
					<p class="text-lg text-zinc-600 dark:text-zinc-400 mb-4">
						{puzzle.description}
					</p>
				</div>
				<img
					src={puzzle.imageUrl}
					alt={puzzle.title}
					class="w-32 h-20 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800"
				/>
			</div>

			<div class="flex items-center gap-4 text-sm">
				<span class="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full">
					{puzzle.category}
				</span>
				<span class="px-3 py-1 rounded-full {getDifficultyColor(puzzle.difficulty)}">
					{puzzle.difficulty}
				</span>
				<span class="text-zinc-600 dark:text-zinc-400">
					{puzzle.solveCount} solves
				</span>
				<span class="text-zinc-600 dark:text-zinc-400">
					by {puzzle.createdBy}
				</span>
			</div>
		</div>

		<!-- Game Area -->
		<div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
			<!-- Game Status -->
			<div class="flex items-center justify-between mb-6">
				<div class="text-sm text-zinc-600 dark:text-zinc-400">
					Create four groups of four!
				</div>
				<div class="flex items-center gap-4">
					<div class="text-sm text-zinc-600 dark:text-zinc-400">
						Mistakes: {mistakes}/{maxMistakes}
					</div>
					<button
						on:click={resetGame}
						class="px-3 py-1 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
					>
						New Game
					</button>
				</div>
			</div>

			<!-- Solved Groups -->
			{#each solvedGroups as group}
				<div class="mb-4 p-4 rounded-lg {group.color}">
					<div class="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
						{group.name}
					</div>
					<div class="grid grid-cols-4 gap-2">
						{#each group.words as word}
							<div class="bg-white/50 dark:bg-zinc-800/50 p-3 rounded text-center font-medium text-zinc-900 dark:text-zinc-100">
								{word}
							</div>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Game Grid -->
			{#if !gameComplete}
				<div class="grid grid-cols-4 gap-3 mb-6">
					{#each shuffledWords as word}
						<button
							on:click={() => toggleWordSelection(word)}
							disabled={isWordSolved(word)}
							class="p-4 rounded-lg border-2 transition-all font-medium
								{selectedWords.includes(word) 
									? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100' 
									: 'border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:border-purple-300 dark:hover:border-purple-700'
								}
								{isWordSolved(word) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
							"
						>
							{word}
						</button>
					{/each}
				</div>

				<!-- Submit Button -->
				<div class="text-center">
					<button
						on:click={submitGuess}
						disabled={selectedWords.length !== 4}
						class="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
					>
						Submit ({selectedWords.length}/4)
					</button>
				</div>
			{/if}

			<!-- Game Complete -->
			{#if gameComplete}
				<div class="text-center py-8">
					{#if showSolution}
						<div class="text-6xl mb-4">😔</div>
						<h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Game Over</h2>
						<p class="text-zinc-600 dark:text-zinc-400 mb-6">
							You've reached the maximum number of mistakes. Here's the solution:
						</p>
					{:else}
						<div class="text-6xl mb-4">🎉</div>
						<h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Congratulations!</h2>
						<p class="text-zinc-600 dark:text-zinc-400 mb-6">
							You solved the puzzle with {mistakes} mistake{mistakes !== 1 ? 's' : ''}!
						</p>
					{/if}

					{#if showSolution}
						<div class="space-y-4 mb-6">
							{#each puzzle.solution.groups as group}
								{#if !solvedGroups.some(solved => solved.name === group.name)}
									<div class="p-4 rounded-lg {group.color}">
										<div class="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 text-center">
											{group.name}
										</div>
										<div class="grid grid-cols-4 gap-2">
											{#each group.words as word}
												<div class="bg-white/50 dark:bg-zinc-800/50 p-3 rounded text-center font-medium text-zinc-900 dark:text-zinc-100">
													{word}
												</div>
											{/each}
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/if}

					<div class="flex justify-center gap-4">
						<button
							on:click={resetGame}
							class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
						>
							Play Again
						</button>
						<a
							href="/browse"
							class="px-6 py-3 bg-zinc-600 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
						>
							Browse More Puzzles
						</a>
					</div>
				</div>
			{/if}
		</div>

		<!-- Puzzle Info -->
		<div class="mt-8 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
			<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">About This Puzzle</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<h4 class="font-medium text-zinc-900 dark:text-zinc-100 mb-2">Puzzle Details</h4>
					<dl class="space-y-1 text-sm">
						<div class="flex justify-between">
							<dt class="text-zinc-600 dark:text-zinc-400">Category:</dt>
							<dd class="text-zinc-900 dark:text-zinc-100">{puzzle.category}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-zinc-600 dark:text-zinc-400">Difficulty:</dt>
							<dd class="text-zinc-900 dark:text-zinc-100">{puzzle.difficulty}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-zinc-600 dark:text-zinc-400">Total Solves:</dt>
							<dd class="text-zinc-900 dark:text-zinc-100">{puzzle.solveCount}</dd>
						</div>
						<div class="flex justify-between">
							<dt class="text-zinc-600 dark:text-zinc-400">Created By:</dt>
							<dd class="text-zinc-900 dark:text-zinc-100">{puzzle.createdBy}</dd>
						</div>
					</dl>
				</div>
				<div>
					<h4 class="font-medium text-zinc-900 dark:text-zinc-100 mb-2">How to Play</h4>
					<ul class="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
						<li>• Find groups of four items that share something in common</li>
						<li>• Select four items and click Submit to make a guess</li>
						<li>• You have {maxMistakes} mistakes before the game ends</li>
						<li>• Each group has exactly four items - no more, no less!</li>
					</ul>
				</div>
			</div>
		</div>
	</main>
{:else}
	<main class="mx-auto max-w-4xl px-4 pt-8">
		<div class="text-center py-12">
			<div class="text-6xl mb-4">🧩</div>
			<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Puzzle Not Found</h1>
			<p class="text-zinc-600 dark:text-zinc-400 mb-6">
				The puzzle you're looking for doesn't exist or has been removed.
			</p>
			<a
				href="/browse"
				class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
			>
				Browse All Puzzles
			</a>
		</div>
	</main>
{/if}
