<script lang="ts">
	import PuzzleEditor from '$lib/components/PuzzleEditor.svelte';
	import { goto } from '$app/navigation';

	// Firestore imports only when needed (SSR-safe)
	async function handleSubmit(e: CustomEvent<{ title: string; size: string; categories: any[]; theme?: string }>) {
		const fb = await import('$lib/firebase'); // your app wrapper exporting { db, auth }
		const { db, auth } = fb as any;
		const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

		const uid = auth?.currentUser?.uid ?? null;

		const payload = {
			title: e.detail.title,
			size: e.detail.size,
			categories: e.detail.categories,
			theme: e.detail.theme,
			createdAt: serverTimestamp(),
			author: uid
				? {
						uid,
						name: auth.currentUser.displayName ?? '',
						email: auth.currentUser.email ?? '',
						photoURL: auth.currentUser.photoURL ?? ''
					}
				: null,
			isPublished: false,
			status: 'draft'
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
