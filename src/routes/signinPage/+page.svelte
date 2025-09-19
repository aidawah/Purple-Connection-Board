<!-- src/routes/signin/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { signInWithGoogle, signInWithApple, upsertUser } from '$lib/firebase';
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
			console.log('Starting authentication with', provider);
			const result = provider === 'google' ? await signInWithGoogle() : await signInWithApple();
			console.log('Authentication result:', result);

			// Create/update user document in Firebase
			if (result?.user) {
				console.log('Creating user document for:', result.user.uid, result.user.email);
				try {
					await upsertUser(result.user);
					console.log('User document created successfully');
				} catch (upsertError: any) {
					console.error('Failed to create user document:', upsertError);
					errorMsg = `User document creation failed: ${upsertError?.message || 'Unknown error'}`;
					return;
				}
			} else {
				console.error('No user in authentication result');
				errorMsg = 'Authentication succeeded but no user data received.';
				return;
			}

			redirectAfterAuth();
		} catch (err: any) {
			console.error('Auth error:', err);
			errorMsg = err?.message || 'Authentication failed.';
		} finally {
			loadingProvider = null;
		}
	}
</script>

<!-- Page background (dark-mode aware) -->
<div
	class="flex min-h-[100svh] items-center justify-center bg-zinc-50 px-4 py-10 sm:px-6 dark:bg-zinc-950"
>
	<!-- Card (dark-mode aware) -->
	<div
		class="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl sm:max-w-md sm:p-8
           dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
		role="dialog"
		aria-labelledby="signin-title"
	>
		<!-- Logo with teal accent -->
		<div class="mb-6 flex justify-center">
			<div
				class="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-[#2EE8C2]/15 ring-1 ring-[#2EE8C2]/30 sm:h-24 sm:w-24
               dark:bg-[#2EE8C2]/10 dark:ring-[#2EE8C2]/25"
			>
				<img
					src="/Logo_transparent.png"
					alt="HealthSpaces"
					class="h-16 w-auto object-contain sm:h-18"
					on:error={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
				/>
			</div>
		</div>

		<!-- Title -->
		<div class="text-center">
			<h1 id="signin-title" class="text-2xl font-bold tracking-tight sm:text-3xl">Sign in</h1>
			<p class="mt-2 text-sm text-zinc-600 sm:text-base dark:text-zinc-300">
				Use Google or Apple to continue
			</p>
		</div>

		<!-- Buttons -->
		<div class="mt-6 space-y-3" aria-live="polite">
			<!-- Google (white in light, black in dark, strong teal hover) -->
			<button
				type="button"
				aria-label="Sign in with Google"
				class="group inline-flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300
               bg-white px-4 py-3 font-semibold text-black shadow
               transition duration-200
               hover:bg-[#2EE8C2] hover:text-black focus:outline-none
               focus-visible:ring-2 focus-visible:ring-[#2EE8C2]/70 disabled:opacity-60
               dark:border-[#2EE8C2]/50 dark:bg-black dark:text-white dark:shadow-md"
				on:click={() => handle('google')}
				disabled={loadingProvider !== null}
				aria-busy={loadingProvider === 'google'}
			>
				{#if loadingProvider === 'google'}
					<span class="inline-flex items-center gap-3">
						<span
							class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></span>
						<span>Signing in…</span>
					</span>
				{:else}
					<i
						class="bx bxl-google text-2xl text-[#2EE8C2] transition-colors group-hover:text-black"
						aria-hidden="true"
					></i>
					<span>Sign in with Google</span>
				{/if}
			</button>

			<!-- Apple (white in light, black in dark, strong teal hover) -->
			<button
				type="button"
				aria-label="Sign in with Apple"
				class="group inline-flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300
               bg-white px-4 py-3 font-semibold text-black shadow
               transition duration-200
               hover:bg-[#2EE8C2] hover:text-black focus:outline-none
               focus-visible:ring-2 focus-visible:ring-[#2EE8C2]/70 disabled:opacity-60
               dark:border-[#2EE8C2]/50 dark:bg-black dark:text-white dark:shadow-md"
				on:click={() => handle('apple')}
				disabled={loadingProvider !== null}
				aria-busy={loadingProvider === 'apple'}
			>
				{#if loadingProvider === 'apple'}
					<span class="inline-flex items-center gap-3">
						<span
							class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></span>
						<span>Signing in…</span>
					</span>
				{:else}
					<i
						class="bx bxl-apple text-2xl text-[#2EE8C2] transition-colors group-hover:text-black"
						aria-hidden="true"
					></i>
					<span>Sign in with Apple</span>
				{/if}
			</button>

			<!-- Divider -->
			<div aria-hidden="true" class="my-2 h-px w-full bg-zinc-900/10 dark:bg-white/12"></div>

			<!-- Back — white on light; darker on dark; teal on hover -->
			<button
				type="button"
				class="group mx-auto flex w-1/2 items-center justify-center gap-2 rounded-md border border-zinc-200
               bg-white px-3 py-2 text-sm font-semibold text-black
               transition duration-200
               hover:bg-[#2EE8C2] hover:text-black focus:outline-none
               focus-visible:ring-2 focus-visible:ring-[#2EE8C2]/60
               dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100
               dark:hover:bg-[#2EE8C2] dark:hover:text-black"
				on:click={backOrHome}
			>
				<i class="bx bx-arrow-back text-sm transition-colors" aria-hidden="true"></i>
				<span>Back</span>
			</button>
		</div>

		<!-- Error -->
		{#if errorMsg}
			<div
				class="mt-5 rounded-xl bg-rose-600/10 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-400/25
               dark:bg-rose-600/20 dark:text-white dark:ring-rose-400/40"
				role="alert"
			>
				{errorMsg}
			</div>
		{/if}

		<!-- Fine print -->
		<p class="mt-5 text-center text-xs text-zinc-500 sm:text-sm dark:text-zinc-400">
			By continuing, you agree to our Terms and acknowledge our Privacy Policy.
		</p>
	</div>
</div>
