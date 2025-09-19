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
		photoURL: string;
	} = {
		name: '',
		email: '',
		bio: '',
		theme: 'light',
		photoURL: ''
	};

	let name = userData.name;
	let email = userData.email;
	let bio = userData.bio;
	let imageError = false;
	import { browser } from '$app/environment';
	let isDark =
		userData.theme === 'dark' || (browser && document.documentElement?.classList.contains('dark'));
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

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
	on:click={() => dispatch('close', undefined)}
>
	<div
		class="fixed top-16 left-1/2 mt-4 w-96 -translate-x-1/2 rounded-lg bg-white p-6 dark:bg-zinc-800"
		on:click|stopPropagation
	>
		{#if isEditing}
			<h2 class="mb-4 text-xl font-bold dark:text-white">Edit Profile</h2>
			<form class="space-y-4" on:submit|preventDefault={handleSave}>
				<div>
					<label class="mb-1 block text-sm font-medium dark:text-zinc-200">Name</label>
					<input
						name="name"
						bind:value={name}
						class="w-full rounded-md border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium dark:text-zinc-200">Email</label>
					<input
						name="email"
						type="email"
						value={email}
						class="w-full rounded-md border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
						readonly
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium dark:text-zinc-200">Bio</label>
					<textarea
						name="bio"
						bind:value={bio}
						class="w-full rounded-md border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
						rows="3"
					/>
				</div>

				<div class="flex items-center justify-between">
					<label class="text-sm font-medium dark:text-zinc-200">Dark Mode</label>
					<button
						type="button"
						on:click={toggleTheme}
						class="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-200 dark:bg-zinc-600"
					>
						<span class="sr-only">Toggle dark mode</span>
						<span
							class={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
						/>
					</button>
				</div>

				<div class="mt-6 flex justify-end gap-2">
					<button
						type="button"
						on:click={() => dispatch('close', undefined)}
						class="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						Save Changes
					</button>
				</div>
			</form>
		{:else}
			<h2 class="mb-4 text-xl font-bold dark:text-white">My Profile</h2>
			<div class="space-y-4">
				<div class="mb-6 flex items-center gap-4">
					{#if userData.photoURL && !imageError}
						{#key userData.photoURL}
							<img
								src={userData.photoURL}
								alt="Profile"
								class="h-16 w-16 rounded-full border-2 border-white shadow-sm"
								on:error={() => (imageError = true)}
							/>
						{/key}
					{:else}
						<div
							class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-2xl font-bold text-white"
						>
							{userData.name
								? userData.name
										.split(' ')
										.map((n) => n[0])
										.join('')
								: ''}
						</div>
					{/if}
					<div>
						<p class="text-lg font-semibold dark:text-white">{name}</p>
						<p class="text-sm text-zinc-600 dark:text-zinc-400">{email}</p>
					</div>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium dark:text-zinc-200">Bio</label>
					<p class="whitespace-pre-line dark:text-white">{bio || 'No bio provided'}</p>
				</div>
				<div class="flex items-center justify-between">
					<label class="text-sm font-medium dark:text-zinc-200">Dark Mode</label>
					<button
						type="button"
						on:click={toggleTheme}
						class="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-200 dark:bg-zinc-600"
					>
						<span class="sr-only">Toggle dark mode</span>
						<span
							class={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
						/>
					</button>
				</div>
				<div class="mt-6 flex justify-end gap-2">
					<button
						type="button"
						on:click={() => dispatch('close', undefined)}
						class="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
					>
						Close
					</button>
					<button
						on:click={() => (isEditing = true)}
						class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						Edit Profile
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
