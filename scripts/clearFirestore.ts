// scripts/clearFirestore.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const saPath = resolve(__dirname, './sa.json');
const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

if (process.env.CONFIRM_NUKE !== 'YES') {
	console.error(
		'\n⚠️  Refusing to run. Set CONFIRM_NUKE=YES to proceed.\n' +
			'   macOS/Linux:  CONFIRM_NUKE=YES pnpm run nuke:firestore\n' +
			"   Windows PS:   $env:CONFIRM_NUKE='YES'; pnpm run nuke:firestore\n"
	);
	process.exit(1);
}

async function deleteQueryBatch(colPath: string, batchSize = 500) {
	const colRef = db.collection(colPath);
	let deletedTotal = 0;
	while (true) {
		const snap = await colRef.select().limit(batchSize).get();
		if (snap.empty) break;

		const batch = db.batch();
		snap.docs.forEach((doc) => batch.delete(doc.ref));
		await batch.commit();

		deletedTotal += snap.size;
		// eslint-disable-next-line no-console
		console.log(`  - Deleted ${snap.size} from ${colPath} (total ${deletedTotal})`);
		if (snap.size < batchSize) break;
	}
	return deletedTotal;
}

async function deleteSubcollection(parentPath: string, subName: string, batchSize = 500) {
	return deleteQueryBatch(`${parentPath}/${subName}`, batchSize);
}

async function deleteKnownSubcollectionsForPuzzle(puzzleId: string) {
	const base = `puzzles/${puzzleId}`;
	await deleteSubcollection(base, 'plays');
	await deleteSubcollection(base, 'reactions');
	await deleteSubcollection(base, 'comments');
}

async function deleteKnownSubcollectionsForUser(uid: string) {
	const base = `users/${uid}`;
	await deleteSubcollection(base, 'collections');
}

async function nukePuzzles() {
	console.log('🧨 Deleting puzzles (and subcollections)...');
	const col = db.collection('puzzles');
	const pageSize = 250;
	while (true) {
		const snap = await col.select().limit(pageSize).get();
		if (snap.empty) break;

		for (const d of snap.docs) {
			await deleteKnownSubcollectionsForPuzzle(d.id);
		}

		const batch = db.batch();
		snap.docs.forEach((d) => batch.delete(d.ref));
		await batch.commit();

		console.log(`  - Deleted ${snap.size} puzzle docs`);
		if (snap.size < pageSize) break;
	}
}

async function nukeUsers() {
	console.log('🧨 Deleting users (and subcollections)...');
	const col = db.collection('users');
	const pageSize = 250;
	while (true) {
		const snap = await col.select().limit(pageSize).get();
		if (snap.empty) break;

		for (const d of snap.docs) {
			await deleteKnownSubcollectionsForUser(d.id);
		}

		const batch = db.batch();
		snap.docs.forEach((d) => batch.delete(d.ref));
		await batch.commit();

		console.log(`  - Deleted ${snap.size} user docs`);
		if (snap.size < pageSize) break;
	}
}

async function nukeActivity() {
	console.log('🧨 Deleting activity...');
	await deleteQueryBatch('activity');
}

async function nukePinsIfAny() {
	// Only runs if you ever add a top-level "pins" collection
	console.log('🧨 Deleting pins (if present)...');
	await deleteQueryBatch('pins');
}

async function main() {
	console.log('⚠️  FINAL WARNING: Deleting Firestore data from this project.');
	await nukePuzzles();
	await nukeUsers();
	await nukeActivity();
	await nukePinsIfAny();

	console.log('✅ Firestore clear complete.');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
