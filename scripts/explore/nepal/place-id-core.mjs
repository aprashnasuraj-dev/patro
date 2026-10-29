import { randomBytes } from "node:crypto";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeBase32(value, length) {
  let n = BigInt(value), out = "";
  for (let i = 0; i < length; i++) {
    out = CROCKFORD[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return out;
}

export function createUlid(nowMs = Date.now(), bytes = randomBytes(10)) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 10) throw new Error("ULID requires 10 random bytes");
  if (!Number.isFinite(nowMs) || nowMs < 0 || nowMs > 281474976710655) throw new Error("ULID timestamp out of range");
  let random = 0n;
  for (const b of bytes) random = (random << 8n) | BigInt(b);
  return encodeBase32(BigInt(Math.floor(nowMs)), 10) + encodeBase32(random, 16);
}

export function emptyPlaceIdMap() {
  return { version: 1, entries: {} };
}

export function reconcilePlaceIds(existing, sourceIds, options = {}) {
  const now = options.now || new Date();
  const random = options.randomBytes || (() => randomBytes(10));
  const date = now.toISOString().slice(0, 10);
  const map = existing && existing.version === 1 ? structuredClone(existing) : emptyPlaceIdMap();
  const unique = [...new Set(sourceIds.map(String).filter(Boolean))].sort();
  for (const sourceId of unique) {
    const old = map.entries[sourceId];
    if (old) {
      old.last_seen = date;
      continue;
    }
    map.entries[sourceId] = {
      place_id: createUlid(now.getTime(), random()),
      first_seen: date,
      last_seen: date,
    };
  }
  return map;
}

export function validatePlaceIdMap(map) {
  const errors = [];
  if (!map || map.version !== 1 || !map.entries || typeof map.entries !== "object") return ["invalid mapping envelope"];
  const ids = new Set();
  for (const [sourceId, value] of Object.entries(map.entries)) {
    if (!/^[nwr]\d+$/.test(sourceId)) errors.push("invalid source id: " + sourceId);
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(value.place_id || "")) errors.push("invalid place id: " + sourceId);
    if (ids.has(value.place_id)) errors.push("duplicate place id: " + value.place_id);
    ids.add(value.place_id);
  }
  return errors;
}
