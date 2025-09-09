<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	type EventPayloads = {
		save: {
			name: string;
			email: string;
			bio: string;
			theme: string;
		};
		close: undefined;
	};
	
	const dispatch = createEventDispatcher<EventPayloads>();
	
	export let userData: {
		name: string;
		email: string;
		bio: string;
		theme: string;
		photoURL?: string;
	} = {
		name: '',
		email: '',
		bio: '',
		theme: 'light'
	};

	let name = userData.name;
	let email = userData.email;
	let bio = userData.bio;
	let imageError = false;
	import { browser } from '$app/environment';
	let isDark = userData.theme === 'dark' || (browser && document.documentElement?.classList.contains('dark'));
	let isEditing = false;

	$: {
		name = userData.name;
		email = userData.email;
		bio = userData.bio;
		if (browser) {
			isDark = userData.theme === 'dark' || document.documentElement.classList.contains('dark');
		}
	}

	function handleSave() {
		const profileData = {
			name: name || '',
			email: email || '',
			bio: bio || '',
			theme: isDark ? 'dark' : 'light'
		};
		dispatch('save', profileData);
		dispatch('close', undefined);
		// Let parent handle closing the modal completely
	}

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
	}
</script>

<div class="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50" on:click={() => dispatch('close', undefined)}>
	<div class="fixed top-16 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 p-6 rounded-lg w-96 mt-4" on:click|stopPropagation>
		{#if isEditing}
			<h2 class="text-xl font-bold mb-4 dark:text-white">Edit Profile</h2>
			<form class="space-y-4" on:submit|preventDefault={handleSave}>
			<div>
				<label class="block text-sm font-medium mb-1 dark:text-zinc-200">Name</label>
				<input name="name" bind:value={name} class="w-full px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" />
			</div>
			
			<div>
				<label class="block text-sm font-medium mb-1 dark:text-zinc-200">Email</label>
				<input name="email" type="email" value={email} class="w-full px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600 dark:text-white" readonly />
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
				<button type="button" on:click={() => dispatch('close', undefined)} class="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md">
					Cancel
				</button>
				<button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
					Save Changes
				</button>
			</div>
		</form>
		{:else}
			<h2 class="text-xl font-bold mb-4 dark:text-white">My Profile</h2>
			<div class="space-y-4">
				<div class="flex items-center gap-4 mb-6">
					{#if userData.photoURL && !imageError}
						<img 
							src={userData.photoURL} 
							alt="Profile" 
							class="w-16 h-16 rounded-full border-2 border-white shadow-sm"
							on:error={() => imageError = true}
						/>
					{:else}
						<div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
							{userData.name ? userData.name.split(' ').map(n => n[0]).join('') : ''}
						</div>
					{/if}
					<div>
						<p class="text-lg font-semibold dark:text-white">{name}</p>
						<p class="text-sm text-zinc-600 dark:text-zinc-400">{email}</p>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1 dark:text-zinc-200">Bio</label>
					<p class="dark:text-white whitespace-pre-line">{bio || 'No bio provided'}</p>
				</div>
				<div class="flex items-center justify-between">
					<label class="text-sm font-medium dark:text-zinc-200">Dark Mode</label>
					<button type="button" on:click={toggleTheme} class="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-200 dark:bg-zinc-600">
						<span class="sr-only">Toggle dark mode</span>
						<span class={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
					</button>
				</div>
				<div class="flex justify-end gap-2 mt-6">
					<button type="button" on:click={() => dispatch('close', undefined)} class="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md">
						Close
					</button>
					<button on:click={() => isEditing = true} class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">
						Edit Profile
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
