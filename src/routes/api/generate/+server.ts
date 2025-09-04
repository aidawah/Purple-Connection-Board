import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const ERR = (message: string, status = 500) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export const POST: RequestHandler = async ({ request }) => {
  try {
    if (!OPENAI_API_KEY) {
      // If you see this in the browser, your .env isn't being read or the dev server wasn't restarted
      return ERR('OPENAI_API_KEY is missing on the server');
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const { categories } = (await request.json()) as {
      categories: { name: string; seedWords: string[]; need: number }[];
    };

    if (!categories || !Array.isArray(categories)) {
      return ERR('Invalid payload: categories[] is required', 400);
    }

    const totalNeed = categories.reduce((n, c) => n + Math.max(0, c?.need ?? 0), 0);
    if (totalNeed === 0) {
      return new Response(JSON.stringify({ groups: categories.map(() => []) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const prompt = [
      `You will generate missing words for several categories.`,
      `Rules:`,
      `- Return ONLY strict JSON: {"groups":[string[]]}`,
      `- "groups" length = number of input categories (same order).`,
      `- Each inner array length = "need" for that category.`,
      `- Do NOT duplicate any "seedWords".`,
      `- Use short, clean words/phrases; no offensive content.`,
      ``,
      `Input categories (index, name, seedWords, need):`,
      ...categories.map(
        (c, i) =>
          `${i}. name="${c.name || 'Untitled'}", seedWords=[${(c.seedWords || []).join(
            ', '
          )}], need=${Math.max(0, c.need || 0)}`
      )
    ].join('\n');

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = completion.choices?.[0]?.message?.content ?? '{"groups":[]}';

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return ERR('Model returned non-JSON output');
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as any).groups)
    ) {
      return ERR('Model JSON is missing "groups" array');
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    // Surface OpenAI / network errors to the client
    const msg =
      e?.response?.data?.error?.message ||
      e?.message ||
      'Unknown server error calling OpenAI';
    console.error('OpenAI error:', e);
    return ERR(msg);
  }
};
