<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$lib/firebase';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import '../app.css';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import favicon from '$lib/assets/favicon.png';

  onMount(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user && $page.url.pathname !== '/' && !$page.url.pathname.startsWith('/signinPage')) {
        goto('/signinPage');
      }
    });
    return () => unsubscribe();
  });
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
