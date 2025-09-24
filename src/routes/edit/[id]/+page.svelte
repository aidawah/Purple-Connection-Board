<script lang="ts">
	import PuzzleEditor from '$lib/components/PuzzleEditor.svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { ThemeKey } from '$lib/themes/themes';

	let id = '';
	const unsub = page.subscribe((p) => (id = p.params.id || ''));

	let initial = {
		title: '',
		size: '4x4',
		categories: [] as Array<{ title: string; words: string[] }>,
		theme: undefined as ThemeKey | undefined
	};
	let loading = true;
	let busy = false;
	let flash: { type: 'success' | 'error' | 'info'; text: string } | null = null;

	// load the puzzle
	onMount(async () => {
		try {
			const fb = await import('$lib/firebase');
			const { db } = fb as any;
			const { doc, getDoc } = await import('firebase/firestore');

			const ref = doc(db, 'puzzles', id);
			const snap = await getDoc(ref);
			if (!snap.exists()) {
				flash = { type: 'error', text: 'Puzzle not found.' };
				return;
			}
			const x = snap.data() || {};
			initial = {
				title: x.title ?? '',
				size: x.size ?? `${x.categories?.length ?? 4}x${x.categories?.[0]?.words?.length ?? 4}`,
				categories: (x.categories ?? []).map((c: any) => ({
					title: c?.title ?? '',
					words: Array.isArray(c?.words) ? c.words : []
				})),
				theme: x.theme
			};
		} catch (e) {
			console.error(e);
			flash = { type: 'error', text: 'Failed to load puzzle.' };
		} finally {
			loading = false;
			setTimeout(() => (flash = null), 2200);
		}
	});

	// save updates
	async function handleSubmit(e: CustomEvent<{ title: string; size: string; categories: any[]; theme?: string }>) {
		try {
			busy = true;
			const fb = await import('$lib/firebase');
			const { db } = fb as any;
			const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

			const ref = doc(db, 'puzzles', id);
			await setDoc(
				ref,
				{
					title: e.detail.title,
					size: e.detail.size,
					categories: e.detail.categories,
					theme: e.detail.theme,
					updatedAt: serverTimestamp()
				},
				{ merge: true }
			);

			flash = { type: 'success', text: 'Updated!' };
		} catch (e) {
			console.error(e);
			flash = { type: 'error', text: 'Save failed.' };
		} finally {
			busy = false;
			setTimeout(() => (flash = null), 2200);
		}
	}

	// publish toggle
	async function togglePublish(next: boolean) {
		try {
			busy = true;
			const fb = await import('$lib/firebase');
			const { db } = fb as any;
			const { doc, setDoc, serverTimestamp, deleteField, getDoc, collection } = await import(
				'firebase/firestore'
			);
			const { getAuth } = await import('firebase/auth');

			const ref = doc(db, 'puzzles', id);

			await setDoc(
				ref,
				{
					isPublished: next,
					status: next ? 'published' : 'draft',
					updatedAt: serverTimestamp(),
					publishedAt: next ? serverTimestamp() : deleteField()
				},
				{ merge: true }
			);

			// If publishing (not unpublishing), create activity record
			if (next) {
				try {
					// Get current user from auth
					const auth = getAuth();
					const user = auth.currentUser;

					if (user) {
						// Get the puzzle data to determine visibility and title
						const puzzleSnap = await getDoc(ref);
						const puzzleData = puzzleSnap.data();
						const visibility = puzzleData?.visibility || 'public';
						const puzzleTitle = puzzleData?.title || 'Untitled';

						// Create activity document
						const activityRef = doc(collection(db, 'activity'));
						await setDoc(activityRef, {
							type: 'puzzle_published',
							actor: {
								uid: user.uid,
								displayName: user.displayName ?? 'Anonymous',
								photoURL: user.photoURL ?? ''
							},
							puzzleId: id,
							puzzleTitle: puzzleTitle, // Include puzzle title directly
							visibility: visibility,
							createdAt: serverTimestamp()
						});
					}
				} catch (activityError) {
					console.error('Failed to create activity record:', activityError);
					// Don't fail the whole publish operation if activity creation fails
				}
			} else {
				// If unpublishing, remove any published activity records for this puzzle
				try {
					// Get current user from auth
					const auth = getAuth();
					const user = auth.currentUser;

					if (user) {
						const { query, where, getDocs, deleteDoc } = await import('firebase/firestore');

						const activityQuery = query(
							collection(db, 'activity'),
							where('type', '==', 'puzzle_published'),
							where('puzzleId', '==', id),
							where('actor.uid', '==', user.uid)
						);
						const activitySnap = await getDocs(activityQuery);

						// Delete all matching activity documents
						const deletePromises = activitySnap.docs.map((doc: any) => deleteDoc(doc.ref));
						await Promise.all(deletePromises);
					}
				} catch (activityError) {
					console.error('Failed to remove activity records:', activityError);
					// Don't fail the whole unpublish operation if activity deletion fails
				}
			}

			flash = { type: 'success', text: next ? 'Published.' : 'Unpublished.' };
		} catch (e) {
			console.error(e);
			flash = { type: 'error', text: 'Publish toggle failed.' };
		} finally {
			busy = false;
			setTimeout(() => (flash = null), 2200);
		}
	}
</script>

<svelte:head><title>Edit Puzzle</title></svelte:head>

<main class="mx-auto max-w-7xl px-3 py-6 sm:px-6">
	<h1 class="mb-4 text-2xl font-bold">Edit Puzzle</h1>

	{#if flash}
		<div
			class="mb-4 rounded border px-3 py-2 text-sm
      {flash.type === 'success'
				? 'border-emerald-200 bg-emerald-50 text-emerald-700'
				: flash.type === 'error'
					? 'border-red-200 bg-red-50 text-red-700'
					: 'border-zinc-200 bg-white text-zinc-700'}"
		>
			{flash.text}
		</div>
	{/if}

	{#if loading}
		<div class="rounded bg-white px-4 py-3 text-sm shadow">Loading…</div>
	{:else}
		<div class="mb-3 flex items-center gap-3">
			<button
				class="rounded border px-3 py-2 text-sm"
				on:click={() => togglePublish(true)}
				disabled={busy}>Publish</button
			>
			<button
				class="rounded border px-3 py-2 text-sm"
				on:click={() => togglePublish(false)}
				disabled={busy}>Unpublish</button
			>
			<a class="ml-auto text-sm text-[color:var(--brand)] underline" href="/profile"
				>Back to Profile</a
			>
		</div>

		<PuzzleEditor
			{initial}
			on:submit={handleSubmit}
			submitLabel="Update"
			draftKey={null}
			{busy}
			brand="#14b8a6"
			enableGenerate
		/>
	{/if}
</main>
