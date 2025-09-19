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
			selectedWords = selectedWords.filter((w) => w !== word);
		} else if (selectedWords.length < 4) {
			selectedWords = [...selectedWords, word];
		}
	}

	function submitGuess() {
		if (selectedWords.length !== 4 || !puzzle) return;

		// Check if the selected words form a correct group
		const correctGroup = puzzle.solution.groups.find(
			(group) =>
				group.words.every((word) => selectedWords.includes(word)) &&
				selectedWords.every((word) => group.words.includes(word))
		);

		if (correctGroup) {
			// Correct guess
			solvedGroups = [...solvedGroups, correctGroup];
			shuffledWords = shuffledWords.filter((word) => !selectedWords.includes(word));
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
			case 'Easy':
				return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
			case 'Medium':
				return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
			case 'Hard':
				return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
			default:
				return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
		}
	}

	function isWordSolved(word: string): boolean {
		return solvedGroups.some((group) => group.words.includes(word));
	}
</script>

<svelte:head>
	<title>{puzzle?.title || 'Puzzle'} - Purple Connection Board</title>
</svelte:head>

{#if puzzle}
	<main class="mx-auto max-w-4xl px-4 pt-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="mb-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
				<a href="/" class="hover:text-purple-600 dark:hover:text-purple-400">Home</a>
				<span>→</span>
				<a href="/browse" class="hover:text-purple-600 dark:hover:text-purple-400">Browse</a>
				<span>→</span>
				<span>{puzzle.title}</span>
			</div>

			<div class="mb-4 flex items-start justify-between">
				<div>
					<h1 class="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
						{puzzle.title}
					</h1>
					<p class="mb-4 text-lg text-zinc-600 dark:text-zinc-400">
						{puzzle.description}
					</p>
				</div>
				<img
					src={puzzle.imageUrl}
					alt={puzzle.title}
					class="h-20 w-32 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
				/>
			</div>

			<div class="flex items-center gap-4 text-sm">
				<span
					class="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
				>
					{puzzle.category}
				</span>
				<span class="rounded-full px-3 py-1 {getDifficultyColor(puzzle.difficulty)}">
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
		<div
			class="rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<!-- Game Status -->
			<div class="mb-6 flex items-center justify-between">
				<div class="text-sm text-zinc-600 dark:text-zinc-400">Create four groups of four!</div>
				<div class="flex items-center gap-4">
					<div class="text-sm text-zinc-600 dark:text-zinc-400">
						Mistakes: {mistakes}/{maxMistakes}
					</div>
					<button
						on:click={resetGame}
						class="rounded-md border border-purple-200 px-3 py-1 text-sm text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20 dark:hover:text-purple-300"
					>
						New Game
					</button>
				</div>
			</div>

			<!-- Solved Groups -->
			{#each solvedGroups as group}
				<div class="mb-4 rounded-lg p-4 {group.color}">
					<div class="mb-2 text-center font-semibold text-zinc-900 dark:text-zinc-100">
						{group.name}
					</div>
					<div class="grid grid-cols-4 gap-2">
						{#each group.words as word}
							<div
								class="rounded bg-white/50 p-3 text-center font-medium text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-100"
							>
								{word}
							</div>
						{/each}
					</div>
				</div>
			{/each}

			<!-- Game Grid -->
			{#if !gameComplete}
				<div class="mb-6 grid grid-cols-4 gap-3">
					{#each shuffledWords as word}
						<button
							on:click={() => toggleWordSelection(word)}
							disabled={isWordSolved(word)}
							class="rounded-lg border-2 p-4 font-medium transition-all
								{selectedWords.includes(word)
								? 'border-purple-500 bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-100'
								: 'border-zinc-300 bg-zinc-50 text-zinc-900 hover:border-purple-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-purple-700'}
								{isWordSolved(word) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
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
						class="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
					>
						Submit ({selectedWords.length}/4)
					</button>
				</div>
			{/if}

			<!-- Game Complete -->
			{#if gameComplete}
				<div class="py-8 text-center">
					{#if showSolution}
						<div class="mb-4 text-6xl">😔</div>
						<h2 class="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Game Over</h2>
						<p class="mb-6 text-zinc-600 dark:text-zinc-400">
							You've reached the maximum number of mistakes. Here's the solution:
						</p>
					{:else}
						<div class="mb-4 text-6xl">🎉</div>
						<h2 class="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
							Congratulations!
						</h2>
						<p class="mb-6 text-zinc-600 dark:text-zinc-400">
							You solved the puzzle with {mistakes} mistake{mistakes !== 1 ? 's' : ''}!
						</p>
					{/if}

					{#if showSolution}
						<div class="mb-6 space-y-4">
							{#each puzzle.solution.groups as group}
								{#if !solvedGroups.some((solved) => solved.name === group.name)}
									<div class="rounded-lg p-4 {group.color}">
										<div class="mb-2 text-center font-semibold text-zinc-900 dark:text-zinc-100">
											{group.name}
										</div>
										<div class="grid grid-cols-4 gap-2">
											{#each group.words as word}
												<div
													class="rounded bg-white/50 p-3 text-center font-medium text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-100"
												>
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
							class="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
						>
							Play Again
						</button>
						<a
							href="/browse"
							class="rounded-lg bg-zinc-600 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700"
						>
							Browse More Puzzles
						</a>
					</div>
				</div>
			{/if}
		</div>

		<!-- Puzzle Info -->
		<div
			class="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<h3 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">About This Puzzle</h3>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div>
					<h4 class="mb-2 font-medium text-zinc-900 dark:text-zinc-100">Puzzle Details</h4>
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
					<h4 class="mb-2 font-medium text-zinc-900 dark:text-zinc-100">How to Play</h4>
					<ul class="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
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
		<div class="py-12 text-center">
			<div class="mb-4 text-6xl">🧩</div>
			<h1 class="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Puzzle Not Found</h1>
			<p class="mb-6 text-zinc-600 dark:text-zinc-400">
				The puzzle you're looking for doesn't exist or has been removed.
			</p>
			<a
				href="/browse"
				class="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
			>
				Browse All Puzzles
			</a>
		</div>
	</main>
{/if}
