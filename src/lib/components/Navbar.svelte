<script lang="ts">
	import { page } from '$app/stores';
	
	const items = [
		{ href: '/', label: 'Home' },
		{ href: '/browse', label: 'Browse Puzzles' },
		{ href: '/create', label: 'Create' }
	];

	import ProfileModal from './ProfileModal.svelte';
	let showProfileModal = false;
	
	function toggleDarkMode() {
		const isDark = document.documentElement.classList.toggle('dark');
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}
</script>

<!-- Desktop -->
<div
	class="sticky top-0 z-50 hidden border-b border-zinc-200/60 bg-white/80 backdrop-blur md:block dark:border-zinc-800/60 dark:bg-zinc-900/70"
	role="navigation"
	aria-label="Primary"
>
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
		<div class="flex-1 flex justify-center">
			<ul class="flex list-none items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
				{#each items.filter(i => i.href !== '/profile') as it}
					<li>
						<a 
							href={it.href} 
							class="rounded-md px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 {($page.url.pathname === it.href || ($page.url.pathname.startsWith('/gameboard') && it.href === '/')) ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold' : ''}"
						>
							{it.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
		
		<div class="flex justify-end">
			<button 
				on:click={() => showProfileModal = true}
				class="rounded-md px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
			>
				My profile
			</button>
			{#if showProfileModal}
				<ProfileModal on:close={() => (showProfileModal = false)} />
			{/if}
		</div>
	</div>
</div>

<!-- Mobile -->
<nav
	class="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/60 bg-white/90 backdrop-blur md:hidden dark:border-zinc-800/60 dark:bg-zinc-900/80"
	role="navigation"
	aria-label="Primary"
>
	<ul
		class="grid h-16 grid-cols-4 items-stretch text-xs font-medium text-zinc-700 dark:text-zinc-100"
	>
		{#each items as it}
			<li class="flex">
				<a
					href={it.href}
					class="mx-1 my-1 flex w-full items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 {$page.url.pathname === it.href || ($page.url.pathname.startsWith('/gameboard') && it.href === '/') ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold' : ''}"
				>
					{it.label}
				</a>
			</li>
		{/each}
		<li class="flex">
			<button
				on:click={() => showProfileModal = true}
				class="mx-1 my-1 flex w-full items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
			>
				My profile
			</button>
		</li>
	</ul>
</nav>
