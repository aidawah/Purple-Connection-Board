<!-- <script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<slot />

{@render children?.()} -->

<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import favicon from '$lib/assets/favicon.svg';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="pb-16 md:pb-0">
	{#if $page.url.pathname !== '/signinPage'}
		<Navbar />
	{/if}

	<slot />

	<Footer />
</div>
