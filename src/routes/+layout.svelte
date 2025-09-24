<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, upsertUser } from '$lib/firebase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import favicon from '$lib/assets/favicon.png';

	onMount(() => {
		const unsubscribe = auth.onAuthStateChanged(async (user) => {
			console.log('Layout: Auth state changed:', user ? `User: ${user.uid}` : 'No user');
			if (!user && $page.url.pathname !== '/' && !$page.url.pathname.startsWith('/signinPage')) {
				console.log('Layout: Redirecting to signin page');
				goto('/signinPage');
			} else if (user) {
				// Ensure user document exists in Firebase
				console.log('Layout: Ensuring user document exists for:', user.uid);
				try {
					await upsertUser(user);
					console.log('Layout: User document created/updated successfully');
				} catch (error) {
					console.error('Layout: Failed to create/update user document:', error);
				}
			}
		});
		return () => unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ThemeProvider>
	<div class="pb-16 md:pb-0">
		{#if $page.url.pathname !== '/signinPage'}
			<Navbar />
		{/if}

		<slot />

		<Footer />
	</div>
</ThemeProvider>
