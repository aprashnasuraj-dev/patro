// Aafnai Patro admin console — cryptographic primitives (Web Crypto only, no deps).
// Passwords: PBKDF2-SHA256 (100k iterations, the Workers runtime maximum).
// Stored API keys: AES-256-GCM, key derived from ADMIN_SECRET (preferred) or a
// random key generated once and kept in D1 (fallback so the console works with
// zero Cloudflare dashboard setup).

const enc = new TextEncoder();
const dec = new TextDecoder();
const PBKDF2_ITERATIONS = 100_000;

export function b64(bytes: Uint8Array) {
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw);
}
export function unb64(text: string) {
  const raw = atob(text);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
export function b64url(bytes: Uint8Array) {
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function randomBytes(n: number) {
  return crypto.getRandomValues(new Uint8Array(n));
}
export function randomToken(n = 32) {
  return b64url(randomBytes(n));
}
export async function sha256Hex(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function timingSafeEqual(a: string, b: string) {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Format: pbkdf2-sha256$<iterations>$<salt b64>$<hash b64> */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > PBKDF2_ITERATIONS) return false;
  try {
    const hash = await pbkdf2(password, unb64(parts[2]), iterations);
    return timingSafeEqual(b64(hash), parts[3]);
  } catch {
    return false;
  }
}

// ---------- AES-GCM for stored secrets ----------

let kekCache: { material: string; key: CryptoKey } | null = null;

async function deriveAesKey(material: string) {
  if (kekCache && kekCache.material === material) return kekCache.key;
  const digest = await crypto.subtle.digest("SHA-256", enc.encode("aap-secrets-v1:" + material));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
  kekCache = { material, key };
  return key;
}

export async function encryptSecret(material: string, plaintext: string) {
  const key = await deriveAesKey(material);
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext)));
  return `v1:${b64(iv)}:${b64(ct)}`;
}

export async function decryptSecret(material: string, payload: string) {
  const [v, iv, ct] = String(payload || "").split(":");
  if (v !== "v1" || !iv || !ct) throw new Error("secret_format_invalid");
  const key = await deriveAesKey(material);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct));
  return dec.decode(pt);
}

// ---------- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) ----------

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array) {
  let bits = 0, value = 0, out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string) {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function hotp(secret: Uint8Array, counter: number) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const offset = mac[mac.length - 1] & 15;
  const code = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

export function newTotpSecret() {
  return base32Encode(randomBytes(20));
}

export async function verifyTotp(secretB32: string, code: string, window = 1) {
  const clean = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const secret = base32Decode(secretB32);
  const step = Math.floor(Date.now() / 30_000);
  for (let w = -window; w <= window; w++) {
    if (timingSafeEqual(await hotp(secret, step + w), clean)) return true;
  }
  return false;
}
