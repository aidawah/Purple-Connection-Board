import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { randomInt } from 'node:crypto';

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

type InCat = { name?: string; seedWords?: string[]; need?: number };
type Body = {
	title?: string;
	categoryCount?: number;
	wordCount?: number;
	mode?: 'all' | 'missing' | 'single';
	targetIndex?: number;
	categories?: InCat[];
	avoidCategories?: string[];
	avoidWords?: string[];
	themeHints?: string[];
	seed?: number | null;
	n?: number;
};

// Common buckets we want to avoid showing up over and over
const DISALLOWED_CATEGORY_NAMES = [
	'colors',
	'colour',
	'fruits',
	'fruit',
	'animals',
	'animal',
	'vehicles',
	'vehicle',
	'shapes',
	'shape',
	'countries',
	'country',
	'months',
	'month',
	'days',
	'day',
	'numbers',
	'number',
	'sports',
	'sport',
	'musical instruments',
	'instrument',
	'foods',
	'food',
	'jobs',
	'job',
	'flowers',
	'flower'
].map((s) => s.toLowerCase());

// Mild word bans to deter repeats across sets
const DISALLOWED_WORDS = [
	'red',
	'blue',
	'green',
	'apple',
	'banana',
	'cat',
	'dog',
	'car',
	'truck',
	'circle',
	'square'
].map((s) => s.toLowerCase());

// If the caller doesn’t give hints, we rotate through varied domains to increase diversity
const THEME_POOL = [
	'healthcare workflows',
	'medical imaging',
	'hospital departments',
	'bioinformatics',
	'construction trades',
	'building materials',
	'HVAC components',
	'finance & accounting terms',
	'supply chain',
	'transport logistics',
	'software testing',
	'frontend frameworks',
	'networking hardware',
	'cloud services',
	'culinary techniques',
	'coffee roasting',
	'baking science',
	'music production',
	'film editing',
	'lighting design',
	'gardening tools',
	'soil science',
	'botany (non-animal)',
	'astronomy (non-astrology)',
	'geology',
	'oceanography',
	'linguistics',
	'etymology',
	'rhetorical devices',
	'board game mechanics',
	'video game genres (specific)'
];

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!OPENAI_API_KEY) return jsonErr('OPENAI_API_KEY missing', 500);

		const body: Body = await request.json();
		const {
			title = '',
			categoryCount = 4,
			wordCount = 4,
			mode = 'all',
			targetIndex = -1,
			categories = [],
			avoidCategories = [],
			avoidWords = [],
			themeHints,
			seed = null,
			n = 4
		} = body ?? {};

		const cc = clampInt(categoryCount, 1, 12);
		const wc = clampInt(wordCount, 2, 12);

		// Build prompts
		const userLines: string[] = [];
		userLines.push(`Puzzle title: ${title || 'Untitled'}`);
		userLines.push(`Category count: ${cc} | Words per category: ${wc}`);
		userLines.push(`Mode: ${mode}`);

		const hints = themeHints && themeHints.length ? themeHints : pickRandomHints(2);

		if (hints.length) userLines.push(`Themes to consider (optional): ${hints.join(', ')}`);

		const allAvoidCats = uniqLower([...avoidCategories, ...DISALLOWED_CATEGORY_NAMES]);
		const allAvoidWords = uniqLower([...avoidWords, ...DISALLOWED_WORDS]);

		if (allAvoidCats.length)
			userLines.push(`Avoid category names (do NOT use): ${allAvoidCats.join(' | ')}`);
		if (allAvoidWords.length)
			userLines.push(`Avoid words (do NOT use): ${allAvoidWords.join(' | ')}`);

		if (mode === 'single' && targetIndex > -1 && categories[targetIndex]) {
			const c = categories[targetIndex];
			userLines.push(`Target category index: ${targetIndex}`);
			userLines.push(`Target category name: ${c.name || 'Untitled'}`);
			userLines.push(`Seed words: ${(c.seedWords || []).join(', ') || 'none'}`);
			userLines.push(`Need: ${c.need ?? 0}`);
		} else {
			userLines.push('Input categories (index, name, seedWords, need):');
			categories.forEach((c, i) => {
				userLines.push(
					`${i}. name="${c.name || 'Untitled'}" | seed=[${(c.seedWords || []).join(', ')}] | need=${c.need ?? 0}`
				);
			});
		}

		userLines.push('Rules:');
		userLines.push('- Use short, concrete words/phrases (1–3 words each).');
		userLines.push('- Keep words within a category tightly related to its name.');
		userLines.push('- Avoid near-duplicates within the same category.');
		userLines.push('- Avoid reusing ANY items from the avoid lists above.');
		userLines.push(
			'- Categories must be meaningfully distinct and NOT generic schoolbook sets (e.g., colors, fruits, animals, vehicles).'
		);
		userLines.push(
			'- For missing-fill, keep existing seed words and add distinct new ones to reach the required length.'
		);

		const schema = {
			type: 'object',
			properties: {
				title: { type: 'string' },
				categories: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							words: { type: 'array', items: { type: 'string' }, minItems: wc, maxItems: wc }
						},
						required: ['name', 'words'],
						additionalProperties: false
					},
					minItems: mode === 'single' ? 1 : cc,
					maxItems: mode === 'single' ? 1 : cc
				}
			},
			required: ['title', 'categories'],
			additionalProperties: false
		} as const;

		// We’ll try up to 3 attempts with new seeds if necessary
		const maxAttempts = 3;
		let attempt = 0;
		let best: any | null = null;

		while (attempt < maxAttempts) {
			const currentSeed = seed ?? randomInt(1, 2_147_483_647);
			const completion = await client.chat.completions.create({
				model: 'gpt-4o-mini',
				temperature: 0.95,
				top_p: 0.95,
				presence_penalty: 0.5,
				frequency_penalty: 0.3,
				n,
				seed: currentSeed,
				response_format: {
					type: 'json_schema',
					json_schema: { name: 'Puzzle', schema, strict: true }
				},
				messages: [
					{
						role: 'system',
						content:
							'You create word-group puzzles like NYT Connections. Return ONLY compact JSON conforming to the schema. No prose.'
					},
					{ role: 'user', content: userLines.join('\n') }
				]
			});

			const candidates = (completion.choices ?? []).map((ch) =>
				safeJSON(ch?.message?.content ?? '{}')
			);
			const outs = candidates.map((p) => toOut(p, title, wc));
			const filtered = outs.filter((o) => passesGuard(o, allAvoidCats, allAvoidWords));

			// If we found any that pass, pick the most novel
			if (filtered.length) {
				const scored = filtered
					.map((out) => ({ out, score: noveltyScore(out, allAvoidCats, allAvoidWords) }))
					.sort((a, b) => b.score - a.score);
				best = scored[0].out;
				break;
			}

			// otherwise retry with a new seed
			attempt++;
		}

		// If still nothing passed, just take the least-bad candidate from last round
		if (!best) {
			best = { title, categories: [] };
		}

		return new Response(JSON.stringify(best), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
		});
	} catch (err: any) {
		const msg = err?.response?.data?.error?.message || err?.message || 'OpenAI request failed';
		console.error('generate endpoint error:', err);
		return jsonErr(msg, 500);
	}
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function clampInt(n: any, min: number, max: number) {
	const v = Math.max(min, Math.min(max, parseInt(n, 10) || min));
	return v;
}

function safeJSON(text: string) {
	try {
		return JSON.parse(text);
	} catch {
		return {};
	}
}

function toOut(parsed: any, fallbackTitle: string, wc: number) {
	return {
		title: typeof parsed?.title === 'string' ? parsed.title : fallbackTitle,
		categories: Array.isArray(parsed?.categories)
			? parsed.categories.map((c: any) => ({
					name: String(c?.name ?? 'Untitled'),
					words: Array.isArray(c?.words) ? c.words.map((w: any) => String(w)).slice(0, wc) : []
				}))
			: []
	};
}

function uniqLower(arr: string[]) {
	return Array.from(new Set(arr.filter(Boolean).map((s) => s.toLowerCase())));
}

function containsDisallowedCategory(name: string, disallowed: string[]) {
	const n = (name || '').toLowerCase();
	return disallowed.some((d) => n === d || n.includes(d));
}

function passesGuard(
	out: { categories: { name: string; words: string[] }[] },
	avoidCats: string[],
	avoidWords: string[]
) {
	const catSet = new Set(avoidCats);
	const wordSet = new Set(avoidWords);
	let distinct = true;

	for (const c of out.categories ?? []) {
		if (containsDisallowedCategory(c.name, avoidCats)) return false;
		// Require some intra-puzzle distinction too:
		if (!c.name || !Array.isArray(c.words) || c.words.length === 0) return false;

		for (const w of c.words) {
			if (wordSet.has((w || '').toLowerCase())) distinct = false;
		}
	}

	// Basic: reject if any category name collides with avoided list or words spam avoided words heavily
	return distinct;
}

/** Higher = more novel vs. avoid lists */
function noveltyScore(
	out: { categories: { name: string; words: string[] }[] },
	avoidCategories: string[],
	avoidWords: string[]
) {
	const avoidCatSet = new Set(avoidCategories.map((s) => s.toLowerCase()));
	const avoidWordSet = new Set(avoidWords.map((s) => s.toLowerCase()));

	let score = 0;

	// reward new category names and diverse word choices
	for (const c of out.categories ?? []) {
		const cname = (c?.name ?? '').toLowerCase();
		score += avoidCatSet.has(cname) ? -10 : 10;

		const seen: Set<string> = new Set();
		for (const w of c?.words ?? []) {
			const lw = (w ?? '').toLowerCase();
			score += avoidWordSet.has(lw) ? -2 : 2;
			// reward internal uniqueness too
			if (seen.has(lw)) score -= 1;
			else {
				seen.add(lw);
				score += 1;
			}
		}
	}
	return score;
}

function pickRandomHints(k: number) {
	const out: string[] = [];
	const used = new Set<number>();
	while (out.length < k && used.size < THEME_POOL.length) {
		const i = randomInt(0, THEME_POOL.length);
		if (!used.has(i)) {
			used.add(i);
			out.push(THEME_POOL[i]);
		}
	}
	return out;
}

function jsonErr(message: string, status = 400) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
	});
}
