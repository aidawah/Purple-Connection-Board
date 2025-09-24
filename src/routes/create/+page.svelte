<script lang="ts">
	import PuzzleEditor from '$lib/components/PuzzleEditor.svelte';
	import { goto } from '$app/navigation';

	// Firestore imports only when needed (SSR-safe)
	async function handleSubmit(e: CustomEvent<{ title: string; size: string; categories: any[]; theme?: string }>) {
		const fb = await import('$lib/firebase'); // your app wrapper exporting { db, auth }
		const { db, auth } = fb as any;
		const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
		
		const uid = auth?.currentUser?.uid ?? null;
		const [gridSize, groupSize] = e.detail.size.split('x').map(Number);
		
		// Create properly structured PuzzleDoc according to types.ts
		const wordsFlat = e.detail.categories.flatMap(cat => cat.words);
		
		const payload = {
			title: e.detail.title,
			description: '',
			gridSize,
			groupSize,
			categories: e.detail.categories.map(cat => ({
				title: cat.title,
				words: cat.words
			})),
			wordsFlat,
			difficulty: 'medium' as const,
			tags: [],
			solutionHash: null,
			theme: e.detail.theme || undefined,
			createdBy: uid ? {
				uid,
				displayName: auth.currentUser.displayName ?? '',
				photoURL: auth.currentUser.photoURL ?? ''
			} : {
				uid: 'anonymous',
				displayName: 'Anonymous',
				photoURL: ''
			},
			// Also add author field to match profile page queries
			author: uid ? {
				uid,
				displayName: auth.currentUser.displayName ?? '',
				photoURL: auth.currentUser.photoURL ?? '',
				email: auth.currentUser.email ?? ''
			} : {
				uid: 'anonymous',
				displayName: 'Anonymous',
				photoURL: '',
				email: ''
			},
			visibility: 'public' as const,
			stats: {
				plays: 0,
				completions: 0,
				avgTimeSec: 0,
				likes: 0
			},
			isPublished: false,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
			// Don't set publishedAt until user explicitly publishes
		};

		const ref = await addDoc(collection(db, 'puzzles'), payload);
		await goto(`/gameboard/${ref.id}`);
	}
</script>

<PuzzleEditor
	on:submit={handleSubmit}
	submitLabel="Save & Play"
	draftKey="pcg:create:draft"
	brand="#14b8a6"
	enableGenerate
/>
