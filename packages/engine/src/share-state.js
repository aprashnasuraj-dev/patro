// Zero-origin share-state codec for Janma Patro / Guna Milan.
//
// Birth inputs are intentionally kept in the URL fragment. Browsers do not send the
// fragment to the HTTP server, Worker, CDN cache key, D1, R2, access logs, or analytics
// endpoints unless client code explicitly copies it there. This keeps deterministic
// calculations browser-local while still allowing explicit user-to-user sharing.

export const JANMAPATRO_SHARE_VERSION = 1;
export const JANMAPATRO_SHARE_PARAM = "jp";
export const JANMAPATRO_MAX_SHARE_BYTES = 8_192;

const MAX_DEPTH = 10;
const MAX_ARRAY_ITEMS = 128;
const MAX_OBJECT_KEYS = 128;
const MAX_STRING_LENGTH = 2_048;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizeJson(value, depth = 0, seen = new Set()) {
  if (depth > MAX_DEPTH) throw new TypeError("share_state_too_deep");
  if (value === null || typeof value === "boolean") return value;

  if (typeof value === "string") {
    if (value.length > MAX_STRING_LENGTH) throw new TypeError("share_state_string_too_long");
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("share_state_non_finite_number");
    return value;
  }

  if (typeof value !== "object") throw new TypeError("share_state_non_json_value");
  if (seen.has(value)) throw new TypeError("share_state_cycle");
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_ITEMS) throw new TypeError("share_state_array_too_large");
      return value.map((entry) => normalizeJson(entry, depth + 1, seen));
    }

    if (!isPlainObject(value)) throw new TypeError("share_state_non_plain_object");
    const keys = Object.keys(value).sort();
    if (keys.length > MAX_OBJECT_KEYS) throw new TypeError("share_state_object_too_large");

    const out = Object.create(null);
    for (const key of keys) {
      if (FORBIDDEN_KEYS.has(key)) throw new TypeError("share_state_forbidden_key");
      if (key.length > 128) throw new TypeError("share_state_key_too_long");
      out[key] = normalizeJson(value[key], depth + 1, seen);
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

function bytesToBase64Url(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = typeof btoa === "function"
    ? btoa(binary)
    : globalThis.Buffer?.from(binary, "binary").toString("base64");
  if (!base64) throw new Error("base64_encoder_unavailable");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new TypeError("invalid_share_payload");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = typeof atob === "function"
    ? atob(padded)
    : globalThis.Buffer?.from(padded, "base64").toString("binary");
  if (binary == null) throw new Error("base64_decoder_unavailable");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function serializedState(state) {
  const normalized = normalizeJson(state);
  if (!isPlainObject(normalized)) throw new TypeError("share_state_must_be_object");
  const text = JSON.stringify(normalized);
  const bytes = encoder.encode(text);
  if (bytes.byteLength > JANMAPATRO_MAX_SHARE_BYTES) throw new RangeError("share_state_too_large");
  return { normalized, bytes };
}

/**
 * Encode normalized browser input into a versioned token. No network/storage call occurs.
 */
export function encodeJanmaPatroShareState(state) {
  const { bytes } = serializedState(state);
  return `v${JANMAPATRO_SHARE_VERSION}.${bytesToBase64Url(bytes)}`;
}

/**
 * Decode and validate a versioned token. The returned object has only JSON-safe values.
 */
export function decodeJanmaPatroShareState(token) {
  if (typeof token !== "string" || token.length > 20_000) throw new TypeError("invalid_share_token");
  const match = token.match(/^v(\d+)\.([A-Za-z0-9_-]+)$/);
  if (!match) throw new TypeError("invalid_share_token");
  if (Number(match[1]) !== JANMAPATRO_SHARE_VERSION) throw new TypeError("unsupported_share_version");

  const bytes = base64UrlToBytes(match[2]);
  if (bytes.byteLength > JANMAPATRO_MAX_SHARE_BYTES) throw new RangeError("share_state_too_large");

  let parsed;
  try {
    parsed = JSON.parse(decoder.decode(bytes));
  } catch {
    throw new TypeError("invalid_share_payload");
  }
  return serializedState(parsed).normalized;
}

/** Return only a fragment; callers can append it to any canonical Janma/Milan page URL. */
export function createJanmaPatroShareHash(state) {
  const token = encodeJanmaPatroShareState(state);
  return `#${JANMAPATRO_SHARE_PARAM}=${token}`;
}

/**
 * Build an explicit share URL without creating a server-side record. The private state is
 * placed after '#', so navigation sends only origin/path/query to the server.
 */
export function createJanmaPatroShareUrl(baseUrl, state) {
  const url = new URL(baseUrl);
  url.hash = createJanmaPatroShareHash(state).slice(1);
  return url.toString();
}

/** Decode a token from a URL, Location-like object, or raw hash. Returns null when absent. */
export function readJanmaPatroShareState(input) {
  let hash = "";
  if (typeof input === "string") {
    if (input.startsWith("#")) hash = input;
    else {
      try { hash = new URL(input).hash; } catch { return null; }
    }
  } else if (input && typeof input === "object" && typeof input.hash === "string") {
    hash = input.hash;
  }
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get(JANMAPATRO_SHARE_PARAM);
  return token ? decodeJanmaPatroShareState(token) : null;
}
