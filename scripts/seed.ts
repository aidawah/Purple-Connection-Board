// scripts/seed.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { seedUsers, seedPuzzles, seedCollections, seedActivity } from './seedData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const saPath = resolve(__dirname, './sa.json');
const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const withTimestamps = (extra: Record<string, unknown> = {}) => ({
	...extra,
	createdAt: FieldValue.serverTimestamp(),
	updatedAt: FieldValue.serverTimestamp()
});

async function seedUsersCol() {
	const batch = db.batch();
	for (const u of seedUsers) {
		const ref = db.doc(`users/${u.id}`);
		batch.set(
			ref,
			withTimestamps({
				displayName: u.displayName,
				bio: u.bio,
				photoURL: u.photoURL,
				email: u.email,
				providerIds: u.providerIds,
				settings: u.settings,
				stats: u.stats,
				pinned: u.pinned
			}),
			{ merge: true }
		);
	}
	await batch.commit();
	console.log(`Seeded users: ${seedUsers.length}`);
}

async function seedPuzzlesCol() {
	const batch = db.batch();
	for (const p of seedPuzzles) {
		const ref = db.doc(`puzzles/${p.id}`);
		batch.set(
			ref,
			{
				title: p.title,
				description: p.description,

				// N×N support
				gridSize: p.gridSize,
				groupSize: p.groupSize,

				categories: p.categories,
				wordsFlat: p.wordsFlat,

				difficulty: p.difficulty,
				tags: p.tags,
				solutionHash: p.solutionHash,
				createdBy: p.createdBy,
				visibility: p.visibility,
				stats: p.stats,
				isPublished: p.isPublished,
				...withTimestamps({ publishedAt: FieldValue.serverTimestamp() })
			},
			{ merge: true }
		);
	}
	await batch.commit();
	console.log(`Seeded puzzles: ${seedPuzzles.length}`);
}

async function seedUserCollections() {
	const batch = db.batch();
	for (const c of seedCollections) {
		const ref = db.doc(`users/${c.ownerUid}/collections/${c.id}`);
		batch.set(
			ref,
			withTimestamps({
				name: c.name,
				description: c.description,
				puzzleIds: c.puzzleIds,
				isPublic: c.isPublic
			}),
			{ merge: true }
		);
	}
	await batch.commit();
	console.log(`Seeded user collections: ${seedCollections.length}`);
}

async function seedActivityFeed() {
	const batch = db.batch();
	for (const a of seedActivity) {
		const ref = db.doc(`activity/${a.id}`);
		batch.set(
			ref,
			withTimestamps({
				type: a.type,
				actor: a.actor,
				puzzleId: a.puzzleId,
				visibility: a.visibility
			}),
			{ merge: true }
		);
	}
	await batch.commit();
	console.log(`Seeded activity: ${seedActivity.length}`);
}

async function main() {
	await seedUsersCol();
	await seedPuzzlesCol();
	await seedUserCollections();
	await seedActivityFeed();
	console.log('✅ Seed complete');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
