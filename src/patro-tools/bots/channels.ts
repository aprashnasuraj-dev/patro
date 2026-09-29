/**
 * Channel adapter surface used by Patro Bot.
 *
 * External bot delivery is intentionally disabled unless a configured backend
 * provider is available. The browser never receives bot secrets.
 */
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export const viber = {
  async verify(_rawBody: string, signature: string | null, expectedSignature: string) {
    return !!signature && timingSafeEqual(signature, expectedSignature);
  },
  keyboard() {
    return { Type: 'keyboard', DefaultHeight: false, Buttons: [] as unknown[] };
  },
  async send() {
    throw new Error('Viber delivery is unavailable until a server-side provider is configured.');
  },
  async broadcast() {
    throw new Error('Viber delivery is unavailable until a server-side provider is configured.');
  },
  async setWebhook() {
    throw new Error('Viber webhook setup is server-only.');
  },
};

export const telegram = {
  verify(headerSecret: string | null, secret: string) {
    return !!headerSecret && timingSafeEqual(headerSecret, secret);
  },
  async send() {
    throw new Error('Telegram delivery is unavailable until a server-side provider is configured.');
  },
  async setWebhook() {
    throw new Error('Telegram webhook setup is server-only.');
  },
};

export interface SubscriberStore {
  set(channel: 'viber' | 'telegram', id: string, subscribed: boolean): Promise<void>;
  list(channel: 'viber' | 'telegram'): Promise<string[]>;
}
