<script lang="ts">
	import { onMount } from 'svelte';

	let isDark = true; // default matches app.html

	function apply(mode: 'light' | 'dark') {
		document.documentElement.classList.toggle('dark', mode === 'dark');
		localStorage.setItem('theme', mode);
		isDark = mode === 'dark';
	}

	function toggleTheme() {
		apply(isDark ? 'light' : 'dark'); // click -> light, click again -> dark
	}

	onMount(() => {
		const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
		apply(stored ?? 'dark');
	});

	const items = [
		{ href: '/', label: 'Home' },
		{ href: '/browse', label: 'Browse Puzzles' },
		{ href: '/create', label: 'Create' },
		{ href: '/profile', label: 'My profile' }
	];
</script>

<!-- Desktop -->
<div
	class="sticky top-0 z-50 hidden border-b border-zinc-200/60 bg-white/80 backdrop-blur md:block dark:border-zinc-800/60 dark:bg-zinc-900/70"
	role="navigation"
	aria-label="Primary"
>
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
		<button
			on:click={toggleTheme}
			class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
		>
			{isDark ? 'Light Mode' : 'Dark Mode'}
		</button>

		<ul
			class="flex list-none items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100"
		>
			{#each items as it}
				<li>
					<a href={it.href} class="rounded-md px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800">
						{it.label}
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>

<!-- Mobile -->
<nav
	class="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/60 bg-white/90 backdrop-blur md:hidden dark:border-zinc-800/60 dark:bg-zinc-900/80"
	role="navigation"
	aria-label="Primary"
>
	<ul
		class="grid h-16 grid-cols-5 items-stretch text-xs font-medium text-zinc-700 dark:text-zinc-100"
	>
		{#each items as it}
			<li class="flex">
				<a
					href={it.href}
					class="mx-1 my-1 flex w-full items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
				>
					{it.label}
				</a>
			</li>
		{/each}
		<li class="flex">
			<button
				type="button"
				on:click={toggleDark}
				aria-pressed={isDark}
				aria-label="Toggle dark mode"
				class="mx-1 my-1 w-full rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
			>
				Dark
			</button>
		</li>
	</ul>
</nav>
