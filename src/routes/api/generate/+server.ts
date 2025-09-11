// src/routes/api/generate/+server.ts
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

type InCat = { name?: string; seedWords?: string[]; need?: number };

export const POST: RequestHandler = async ({ request }) => {
  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const {
      title = '',
      categoryCount = 4,
      wordCount = 4,
      mode = 'all', // 'all' | 'missing' | 'single'
      targetIndex = -1,
      categories = [] as InCat[]
    } = body ?? {};

    const cc = Math.max(1, Math.min(12, Number(categoryCount) || 4));
    const wc = Math.max(2, Math.min(12, Number(wordCount) || 4));

    const system = `You create word-group puzzles like NYT Connections. Output ONLY compact JSON. No prose.`;

    // ✅ Fix: required must include *every* key in properties when strict
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
              words: {
                type: 'array',
                items: { type: 'string' },
                minItems: wc,
                maxItems: wc
              }
            },
            required: ['name', 'words'],
            additionalProperties: false
          },
          minItems: mode === 'single' ? 1 : cc,
          maxItems: mode === 'single' ? 1 : cc
        }
      },
      required: ['title', 'categories'], // ← add 'title' here
      additionalProperties: false
    } as const;

    const lines: string[] = [];
    lines.push(`Puzzle title: ${title || 'Untitled'}`);
    lines.push(`Category count: ${cc} | Words per category: ${wc}`);
    lines.push(`Mode: ${mode}`);
    if (mode === 'single' && targetIndex > -1 && categories[targetIndex]) {
      const c = categories[targetIndex];
      lines.push(`Target category index: ${targetIndex}`);
      lines.push(`Target category name: ${c.name || 'Untitled'}`);
      lines.push(`Seed words: ${(c.seedWords || []).join(', ') || 'none'}`);
      lines.push(`Need: ${c.need ?? 0}`);
    } else {
      lines.push('Input categories (index, name, seedWords, need):');
      categories.forEach((c, i) => {
        lines.push(`${i}. name="${c.name || 'Untitled'}" | seed=[${(c.seedWords || []).join(', ')}] | need=${c.need ?? 0}`);
      });
    }
    lines.push('Rules:');
    lines.push('- Use short, concrete words/phrases (1–3 words each).');
    lines.push('- No profanity/offensive content.');
    lines.push('- Keep words within a category tightly related to its name.');
    lines.push('- Avoid near-duplicates within the same category.');
    lines.push('- For missing-fill, keep existing seed words and add distinct new ones to reach the required length.');

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_schema', json_schema: { name: 'Puzzle', schema, strict: true } },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: lines.join('\n') }
      ]
    });

    const content = completion.choices?.[0]?.message?.content ?? '{}';
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = { categories: [] }; }

    const out = {
      title: typeof parsed.title === 'string' ? parsed.title : title,
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.map((c: any) => ({
            name: String(c?.name ?? 'Untitled'),
            words: Array.isArray(c?.words) ? c.words.map((w: any) => String(w)).slice(0, wc) : []
          }))
        : []
    };

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || 'OpenAI request failed';
    console.error('generate endpoint error:', err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
