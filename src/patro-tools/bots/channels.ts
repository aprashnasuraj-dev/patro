/**
 * Channel adapters.
 *
 * VIBER — Nepal's biggest chat app. Check the current bot terms first: since
 *   2024 Viber requires new bots to be created through a commercial/partner
 *   account and may charge fees. Webhook must be HTTPS. Signature header:
 *   X-Viber-Content-Signature = HMAC-SHA256(body, auth token).
 * TELEGRAM — free, simplest to launch first. Secret header:
 *   X-Telegram-Bot-Api-Secret-Token (set in setWebhook).
 * WHATSAPP — Cloud API; proactive daily messages need approved templates and are billed.
 */
async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ------------------------------ Viber ------------------------------
const VIBER_API = 'https://chatapi.viber.com/pa';

export const viber = {
  async verify(rawBody: string, signature: string | null, token: string) {
    return !!signature && timingSafeEqual(await hmacHex(token, rawBody), signature);
  },
  keyboard() {
    const btn = (text: string, reply: string) => ({ Columns: 2, Rows: 1, ActionType: 'reply', ActionBody: reply, Text: text, BgColor: '#176f3b', TextSize: 'regular', Silent: false });
    return { Type: 'keyboard', DefaultHeight: false, Buttons: [btn('<font color="#ffffff">आज</font>', 'आज'), btn('<font color="#ffffff">भोलि</font>', 'भोलि'), btn('<font color="#ffffff">चाडपर्व</font>', 'दशैं कहिले')] };
  },
  async send(token: string, receiver: string, text: string, withKeyboard = true) {
    const res = await fetch(`${VIBER_API}/send_message`, {
      method: 'POST',
      headers: { 'X-Viber-Auth-Token': token, 'content-type': 'application/json' },
      body: JSON.stringify({ receiver, type: 'text', text, sender: { name: 'मेरो पात्रो' }, min_api_version: 3, ...(withKeyboard ? { keyboard: viber.keyboard() } : {}) }),
    });
    return res.json();
  },
  /** up to 300 receivers per call */
  async broadcast(token: string, receivers: string[], text: string) {
    for (let i = 0; i < receivers.length; i += 300) {
      await fetch(`${VIBER_API}/broadcast_message`, {
        method: 'POST',
        headers: { 'X-Viber-Auth-Token': token, 'content-type': 'application/json' },
        body: JSON.stringify({ broadcast_list: receivers.slice(i, i + 300), type: 'text', text, sender: { name: 'मेरो पात्रो' }, min_api_version: 3 }),
      });
    }
  },
  /** one-time: register the webhook */
  async setWebhook(token: string, url: string) {
    const res = await fetch(`${VIBER_API}/set_webhook`, {
      method: 'POST',
      headers: { 'X-Viber-Auth-Token': token, 'content-type': 'application/json' },
      body: JSON.stringify({ url, event_types: ['subscribed', 'unsubscribed', 'conversation_started', 'message'], send_name: true }),
    });
    return res.json();
  },
};

// ------------------------------ Telegram ------------------------------
export const telegram = {
  verify(headerSecret: string | null, secret: string) {
    return !!headerSecret && timingSafeEqual(headerSecret, secret);
  },
  async send(token: string, chatId: number | string, text: string) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, text,
        reply_markup: { keyboard: [[{ text: 'आज' }, { text: 'भोलि' }], [{ text: 'दशैं कहिले' }, { text: 'सुरु' }]], resize_keyboard: true },
      }),
    });
    return res.json();
  },
  async setWebhook(token: string, url: string, secret: string) {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, secret_token: secret, allowed_updates: ['message'] }),
    });
    return res.json();
  },
};

/** Subscriber storage contract (Postgres table: channel, external_id, subscribed, created_at). */
export interface SubscriberStore {
  set(channel: 'viber' | 'telegram', id: string, subscribed: boolean): Promise<void>;
  list(channel: 'viber' | 'telegram'): Promise<string[]>;
}
