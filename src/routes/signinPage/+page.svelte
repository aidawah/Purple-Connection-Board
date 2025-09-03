<!-- src/routes/signin/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  let errorMsg = '';
  let loadingProvider: 'google' | 'apple' | null = null;

  function redirectAfterAuth() {
    if (!browser) return goto('/');
    const url = new URL(window.location.href);
    const next = url.searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) return goto(next);
    return goto('/');
  }

  function backOrHome() {
    if (!browser) return goto('/');
    const url = new URL(window.location.href);
    const next = url.searchParams.get('next');

    if (next) {
      if (window.history.length > 2) return window.history.go(-2);
      const ref = document.referrer;
      if (ref) {
        try {
          const refURL = new URL(ref);
          if (refURL.origin === window.location.origin && (!next || refURL.pathname !== next)) {
            goto(refURL.pathname + refURL.search + refURL.hash);
            return;
          }
        } catch {}
      }
      goto('/');
      return;
    }
    if (window.history.length > 1) window.history.back();
    else goto('/');
  }

  async function handle(provider: 'google' | 'apple') {
    errorMsg = '';
    loadingProvider = provider;
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
      redirectAfterAuth();
    } catch (err: any) {
      console.error('Auth error:', err);
      errorMsg = err?.message || 'Authentication failed.';
    } finally {
      loadingProvider = null;
    }
  }
</script>

<!-- Page background (white) -->
<div class="min-h-[100svh] bg-white flex items-center justify-center px-4 sm:px-6 py-10">
  <!-- Skinny, high-contrast black card -->
  <div
    class="w-full max-w-sm sm:max-w-md rounded-2xl bg-black text-white shadow-2xl border border-black/70 p-6 sm:p-8"
    role="dialog" aria-labelledby="signin-title"
  >
    <!-- Logo with teal accent -->
    <div class="flex justify-center mb-6">
      <div class="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-[#2EE8C2]/15 ring-1 ring-[#2EE8C2]/40 grid place-items-center overflow-hidden">
        <img
          src="/Logo_transparent.png"
          alt="HealthSpaces"
          class="h-16 sm:h-18 w-auto object-contain"
          on:error={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      </div>
    </div>

    <!-- Title -->
    <div class="text-center">
      <h1 id="signin-title" class="text-2xl sm:text-3xl font-bold tracking-tight">Sign in</h1>
      <p class="mt-2 text-sm sm:text-base text-white/70">Use Google or Apple to continue</p>
    </div>

    <!-- Buttons -->
    <div class="mt-6 space-y-3" aria-live="polite">
      <!-- Google (black default, teal logo, STRONG teal hover) -->
      <button
        type="button"
        aria-label="Sign in with Google"
        class="group w-full inline-flex items-center justify-center gap-3 rounded-xl px-4 py-3
               bg-black text-white font-semibold border border-[#2EE8C2]/60 shadow
               hover:bg-[#2EE8C2] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2EE8C2]/70
               transition duration-200 disabled:opacity-60"
        on:click={() => handle('google')}
        disabled={loadingProvider !== null}
        aria-busy={loadingProvider === 'google'}
      >
        {#if loadingProvider === 'google'}
          <span class="inline-flex items-center gap-3">
            <span class="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            <span>Signing in…</span>
          </span>
        {:else}
          <i class="bx bxl-google text-2xl text-[#2EE8C2] group-hover:text-black transition-colors" aria-hidden="true"></i>
          <span>Sign in with Google</span>
        {/if}
      </button>

      <!-- Apple (black default, teal logo, STRONG teal hover) -->
      <button
        type="button"
        aria-label="Sign in with Apple"
        class="group w-full inline-flex items-center justify-center gap-3 rounded-xl px-4 py-3
               bg-black text-white font-semibold border border-[#2EE8C2]/60 shadow
               hover:bg-[#2EE8C2] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2EE8C2]/70
               transition duration-200 disabled:opacity-60"
        on:click={() => handle('apple')}
        disabled={loadingProvider !== null}
        aria-busy={loadingProvider === 'apple'}
      >
        {#if loadingProvider === 'apple'}
          <span class="inline-flex items-center gap-3">
            <span class="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
            <span>Signing in…</span>
          </span>
        {:else}
          <i class="bx bxl-apple text-2xl text-[#2EE8C2] group-hover:text-black transition-colors" aria-hidden="true"></i>
          <span>Sign in with Apple</span>
        {/if}
      </button>

      <!-- Divider line (no text) -->
      <div aria-hidden="true" class="my-2 h-px w-full bg-white/12"></div>

      <!-- Back — white, half size, TEAL on hover -->
      <button
        type="button"
        class="group w-1/2 mx-auto flex items-center justify-center gap-2 rounded-md px-3 py-2
               bg-white text-black text-sm font-semibold border border-black/10
               hover:bg-[#2EE8C2] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2EE8C2]/60
               transition duration-200"
        on:click={backOrHome}
      >
        <i class="bx bx-arrow-back text-sm transition-colors" aria-hidden="true"></i>
        <span>Back</span>
      </button>
    </div>

    <!-- Error -->
    {#if errorMsg}
      <div
        class="mt-5 px-3 py-2 rounded-xl bg-rose-600/20 text-white ring-1 ring-rose-400/40 text-sm"
        role="alert"
      >
        {errorMsg}
      </div>
    {/if}

    <!-- Fine print -->
    <p class="mt-5 text-center text-xs sm:text-sm text-white/55">
      By continuing, you agree to our Terms and acknowledge our Privacy Policy.
    </p>
  </div>
</div>
