import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const root = process.cwd();
const base = "cloudflare/live-sync/2026-11-03";
const load = path => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const index = load(base + "/worker-archive-index.json");
const inventory = load(base + "/production-inventory.json");
const owner = load("scripts/tool-growth/external-worker-ownership.json");
const fail = message => { throw new Error("PRODUCTION_ARCHIVE: " + message); };
if (index.workers.length !== 38 || inventory.workers.length !== 39) fail("expected 38 archived / 39 live Workers");
if (inventory.routes.length !== 31 || inventory.domains.length !== 29) fail("production route/domain snapshot incomplete");
if (owner.foreignRoutes.length !== inventory.routes.length) fail("route ownership snapshot out of sync");
if (owner.foreignCustomDomains.length !== inventory.domains.length - 1) fail("domain ownership snapshot out of sync");
const names = new Set(inventory.workers.map(x => x.name));
const seen = new Set();
let originalBytes = 0;
let compressedBytes = 0;
for (const item of index.workers) {
  if (!names.has(item.name) || item.name === "patro" || seen.has(item.name)) fail("invalid or duplicate name " + item.name);
  seen.add(item.name);
  if (!item.path.startsWith(base + "/worker-sources/") || !item.path.endsWith(".js.gz")) fail("unexpected archive path");
  const compressed = readFileSync(resolve(root, item.path));
  if (compressed.length < 3 || compressed[0] !== 0x1f || compressed[1] !== 0x8b) fail("not gzip: " + item.name);
  const body = gunzipSync(compressed);
  const digest = createHash("sha256").update(body).digest("hex");
  if (body.length !== item.originalBytes || digest !== item.sourceSha256) fail("source mismatch: " + item.name);
  originalBytes += body.length;
  compressedBytes += compressed.length;
}
console.log(JSON.stringify({ok:true,workers:seen.size,originalBytes,compressedBytes,routes:inventory.routes.length,domains:inventory.domains.length}));
