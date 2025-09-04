<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';

	// Mock data for the feed
	const feedItems = [
		{
			id: 1,
			type: 'puzzle_created',
			user: 'Alice Johnson',
			action: 'created a new puzzle',
			puzzleTitle: 'Tech Giants Connection',
			timestamp: '2 hours ago',
			avatar: 'AJ'
		},
		{
			id: 2,
			type: 'puzzle_solved',
			user: 'Bob Smith',
			action: 'solved',
			puzzleTitle: 'Movie Directors',
			timestamp: '4 hours ago',
			avatar: 'BS'
		},
		{
			id: 3,
			type: 'puzzle_created',
			user: 'Carol Davis',
			action: 'created a new puzzle',
			puzzleTitle: 'World Capitals',
			timestamp: '6 hours ago',
			avatar: 'CD'
		},
		{
			id: 4,
			type: 'puzzle_solved',
			user: 'David Wilson',
			action: 'solved',
			puzzleTitle: 'Programming Languages',
			timestamp: '8 hours ago',
			avatar: 'DW'
		},
		{
			id: 5,
			type: 'puzzle_created',
			user: 'Emma Brown',
			action: 'created a new puzzle',
			puzzleTitle: 'Ancient Civilizations',
			timestamp: '12 hours ago',
			avatar: 'EB'
		}
	];

	// Mock data for featured/pinned puzzles
	const featuredPuzzles = [
		{
			id: 1,
			title: 'Daily Challenge: Sports Teams',
			difficulty: 'Medium',
			solveCount: 1247,
			category: 'Sports',
			isPinned: true
		},
		{
			id: 2,
			title: 'Classic Literature Characters',
			difficulty: 'Hard',
			solveCount: 892,
			category: 'Literature',
			isPinned: true
		},
		{
			id: 3,
			title: 'Popular TV Shows',
			difficulty: 'Easy',
			solveCount: 2156,
			category: 'Entertainment',
			isPinned: false
		},
		{
			id: 4,
			title: 'Chemical Elements',
			difficulty: 'Hard',
			solveCount: 634,
			category: 'Science',
			isPinned: false
		}
	];

	function getDifficultyColor(difficulty: string) {
		switch (difficulty) {
			case 'Easy': return 'text-green-600 dark:text-green-400';
			case 'Medium': return 'text-yellow-600 dark:text-yellow-400';
			case 'Hard': return 'text-red-600 dark:text-red-400';
			default: return 'text-gray-600 dark:text-gray-400';
		}
	}

	function getActivityIcon(type: string) {
		return type === 'puzzle_created' ? '🧩' : '✅';
	}
</script>

<main class="mx-auto max-w-7xl px-4 pt-8">
	<!-- Header Section -->
	<section class="text-center mb-8">
		<h1 class="text-3xl font-bold tracking-tight md:text-5xl mb-4">Purple Connection Board</h1>
		<p class="text-lg text-zinc-600 dark:text-zinc-400">Connect, Create, and Challenge Your Mind!</p>
	</section>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Feed Section (Left/Main Content) -->
		<div class="lg:col-span-2">
			<div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
				<div class="p-6 border-b border-zinc-200 dark:border-zinc-800">
					<h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Recent Activity</h2>
					<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">See what's happening in the community</p>
				</div>
				
				<div class="divide-y divide-zinc-200 dark:divide-zinc-800">
					{#each feedItems as item}
						<div class="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
							<div class="flex items-start space-x-4">
								<!-- Avatar -->
								<div class="flex-shrink-0">
									<div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
										{item.avatar}
									</div>
								</div>
								
								<!-- Content -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center space-x-2 mb-2">
										<span class="text-lg">{getActivityIcon(item.type)}</span>
										<span class="font-medium text-zinc-900 dark:text-zinc-100">{item.user}</span>
										<span class="text-zinc-600 dark:text-zinc-400">{item.action}</span>
									</div>
									
									<div class="bg-zinc-100 dark:bg-zinc-800 rounded-md p-3 mb-2">
										<h3 class="font-medium text-zinc-900 dark:text-zinc-100">{item.puzzleTitle}</h3>
									</div>
									
									<div class="flex items-center justify-between">
										<span class="text-sm text-zinc-500 dark:text-zinc-400">{item.timestamp}</span>
										<button class="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">
											View Puzzle
										</button>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
				
				<!-- Load More Button -->
				<div class="p-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
					<button class="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
						Load More Activity
					</button>
				</div>
			</div>
		</div>

		<!-- Featured/Pinned Puzzles Sidebar -->
		<div class="lg:col-span-1">
			<div class="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-20">
				<div class="p-6 border-b border-zinc-200 dark:border-zinc-800">
					<h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Featured Puzzles</h2>
					<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Popular and pinned challenges</p>
				</div>
				
				<div class="p-6 space-y-4">
					{#each featuredPuzzles as puzzle}
						<div class="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
							<div class="flex items-start justify-between mb-2">
								<h3 class="font-medium text-zinc-900 dark:text-zinc-100 text-sm leading-tight">{puzzle.title}</h3>
								{#if puzzle.isPinned}
									<span class="text-yellow-500 text-sm" title="Pinned">📌</span>
								{/if}
							</div>
							
							<div class="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2">
								<span class="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">{puzzle.category}</span>
								<span class="{getDifficultyColor(puzzle.difficulty)} font-medium">{puzzle.difficulty}</span>
							</div>
							
							<div class="flex items-center justify-between">
								<span class="text-xs text-zinc-500 dark:text-zinc-400">{puzzle.solveCount} solves</span>
								<button class="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">
									Play →
								</button>
							</div>
						</div>
					{/each}
				</div>
				
				<!-- View All Button -->
				<div class="p-6 border-t border-zinc-200 dark:border-zinc-800">
					<button class="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors">
						Browse All Puzzles
					</button>
				</div>
			</div>
		</div>
	</div>
</main>
