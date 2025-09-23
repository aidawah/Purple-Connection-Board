// src/routes/api/twilio-status/+server.ts
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const form = await request.formData();           // x-www-form-urlencoded
  const data = Object.fromEntries(form.entries()); // { MessageSid, MessageStatus, ErrorCode, ... }
  console.log('[TWILIO STATUS]', data);
  return new Response('ok');                       // 200 so Twilio doesn’t retry
};

// (Optional) quick GET to verify the route exists
export const GET: RequestHandler = async () => {
  return new Response(JSON.stringify({ ok: true, route: '/api/twilio-status' }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};
