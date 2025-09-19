// src/routes/api/share-sms/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY_SID,
  TWILIO_API_KEY_SECRET,
  TWILIO_FROM,
  TWILIO_MESSAGING_SERVICE_SID
} from '$env/static/private';
import twilio from 'twilio';

const client = twilio(
  TWILIO_API_KEY_SID,
  TWILIO_API_KEY_SECRET,
  { accountSid: TWILIO_ACCOUNT_SID }
);

function isE164(n: string) {
  return /^\+?[1-9]\d{1,14}$/.test(n);
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { to, title, url } = await request.json();
    if (!to || !isE164(to)) {
      return json({ error: 'Invalid phone number.' }, { status: 400 });
    }
    if (!url) {
      return json({ error: 'Missing URL.' }, { status: 400 });
    }

    const body = `Play “${title || 'Puzzle'}” on Purple Connection Board: ${url}`;

    const msg = await client.messages.create({
      to,
      body,
      ...(TWILIO_MESSAGING_SERVICE_SID
        ? { messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID }
        : { from: TWILIO_FROM }) // requires a number
    });

    return json({ ok: true, sid: msg.sid });
  } catch (err: any) {
    console.error('Twilio send failed:', err);
    return json({ error: 'Failed to send SMS.' }, { status: 500 });
  }
};
