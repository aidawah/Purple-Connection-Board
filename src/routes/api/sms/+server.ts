// src/routes/api/sms/+server.ts
import type { RequestHandler } from './$types';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const twilio = require('twilio'); // Twilio SDK is CommonJS

import { PUBLIC_BASE_URL } from '$env/static/public'; // public, safe
import {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY_SID,
  TWILIO_API_KEY_SECRET,
  TWILIO_MESSAGING_SERVICE_SID,
} from '$env/static/private'; // server-only

function toE164(input: string) {
  if (!input) return '';
  const s = input.trim();
  if (s.startsWith('+')) return s;
  const digits = s.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return '';
}

function getClient() {
  return twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, { accountSid: TWILIO_ACCOUNT_SID });
}

// Optional: quick GET to confirm the route exists

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { to: rawTo, puzzleId } = await request.json();

    const to = toE164(rawTo);
    if (!to) return new Response(JSON.stringify({ error: 'Enter a valid phone (e.g., 217-440-4327).' }), { status: 400 });
    if (!puzzleId) return new Response(JSON.stringify({ error: 'Missing puzzleId.' }), { status: 400 });

    const base = PUBLIC_BASE_URL || `${url.protocol}//${url.host}`;
    const playUrl = `${base}/gameboard/${encodeURIComponent(puzzleId)}`;

    // Only set callback if it’s a public HTTPS URL (Twilio cannot call localhost)
    const statusCallback =
      base.startsWith('https://') ? `${base}/api/twilio-status` : undefined;

    const client = getClient();
    const msg = await client.messages.create({
      to,
      messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
      body: `Your puzzle is ready! Play here: ${playUrl}`,
      ...(statusCallback ? { statusCallback } : {})
    });

    console.log('[SMS SENT]', { sid: msg.sid, to, statusCallback });
    return new Response(JSON.stringify({ sid: msg.sid, to }), { status: 200 });
  } catch (err: any) {
    console.error('[api/sms] error', { code: err?.code, status: err?.status, message: err?.message, moreInfo: err?.moreInfo });
    return new Response(JSON.stringify({ error: err?.message || 'Send failed' }), { status: 500 });
  }
};

