/**
 * Sealing letters. Uses WebCrypto only → same code runs in browser, Node 20+,
 * and Vercel Edge.
 *
 * Two modes:
 *  - 'passphrase': encrypted IN THE BROWSER with a passphrase the writer shares
 *    with the recipient (e.g. "your grandmother's village"). The server can
 *    never read it. Best for private letters.
 *  - 'server': encrypted on the server with LETTERS_KEY. Lets you deliver the
 *    letter automatically. Rotate keys with a key id (kid).
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64 = {
  encode: (buf: ArrayBuffer | Uint8Array) => {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  },
  decode: (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
};

export interface Sealed {
  mode: 'passphrase' | 'server';
  kid?: string;
  iv: string;
  salt?: string;
  ciphertext: string;
}

const PBKDF2_ITERATIONS = 310_000;

async function passKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

async function rawKey(keyB64: string) {
  return crypto.subtle.importKey('raw', b64.decode(keyB64) as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealWithPassphrase(plaintext: string, passphrase: string): Promise<Sealed> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await passKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  return { mode: 'passphrase', iv: b64.encode(iv), salt: b64.encode(salt), ciphertext: b64.encode(ct) };
}

export async function openWithPassphrase(s: Sealed, passphrase: string): Promise<string> {
  const key = await passKey(passphrase, b64.decode(s.salt!));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.decode(s.iv) as BufferSource }, key, b64.decode(s.ciphertext) as BufferSource);
  return dec.decode(pt);
}

export async function sealWithServerKey(plaintext: string, keyB64: string, kid = 'k1', aad?: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await rawKey(keyB64);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad ? enc.encode(aad) : undefined }, key, enc.encode(plaintext));
  return { mode: 'server', kid, iv: b64.encode(iv), ciphertext: b64.encode(ct) };
}

export async function openWithServerKey(s: Sealed, keyB64: string, aad?: string): Promise<string> {
  const key = await rawKey(keyB64);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64.decode(s.iv) as BufferSource, additionalData: aad ? enc.encode(aad) : undefined },
    key, b64.decode(s.ciphertext) as BufferSource,
  );
  return dec.decode(pt);
}
