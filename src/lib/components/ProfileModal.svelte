<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	
	export let userData = {
		name: '',
		email: '',
		bio: '',
		theme: 'light'
	};

	let name = userData.name;
	let email = userData.email;
	let bio = userData.bio;
	let isDark = userData.theme === 'dark' || document.documentElement.classList.contains('dark');

	function handleSave() {
		dispatch('save', { name, email, bio, theme: isDark ? 'dark' : 'light' });
	}

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}
</script>

<div class="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50" on:click={() => dispatch('close')}>
	<div class="fixed top-16 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 p-6 rounded-lg w-96 mt-4" on:click|stopPropagation>
		<h2 class="text-xl font-bold mb-4 dark:text-white">Edit Profile</h2>
		
		<form class="space-y-4" on:submit|preventDefault={handleSave}>
			<div>
				<label class="block text-sm font-medium mb-1 dark:text-zinc-200">Name</label>
				<input name="name" bind:value={name} class="w-full px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
			</div>
			
			<div>
				<label class="block text-sm font-medium mb-1 dark:text-zinc-200">Email</label>
				<input name="email" type="email" bind:value={email} class="w-full px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
			</div>
			
			<div>
				<label class="block text-sm font-medium mb-1 dark:text-zinc-200">Bio</label>
				<textarea name="bio" bind:value={bio} class="w-full px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" rows="3" />
			</div>
			
			<div class="flex items-center justify-between">
				<label class="text-sm font-medium dark:text-zinc-200">Dark Mode</label>
				<button type="button" on:click={toggleTheme} class="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-200 dark:bg-zinc-600">
					<span class="sr-only">Toggle dark mode</span>
					<span class={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
				</button>
			</div>
			
			<div class="flex justify-end gap-2 mt-6">
				<button type="button" on:click={() => dispatch('close')} class="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md">
					Cancel
				</button>
				<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
					Save Changes
				</button>
			</div>
		</form>
	</div>
</div>
