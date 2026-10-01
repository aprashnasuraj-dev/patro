import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Patro UI connectivity routes are backed by the production Worker entrypoint", () => {
  const media = read("src/media/MediaSuite.tsx");
  const pages = read("src/AafnaiPages.tsx");
  const shim = read("worker/connected-entry.ts");
  const wranglerToml = read("wrangler.toml");
  const wranglerJson = read("wrangler.jsonc");

  // These are current browser-side contracts. If they change, the Worker must change with them.
  assert.ok(media.includes('compat("tv/catalog?'), "TV catalog still depends on the compatibility namespace");
  assert.ok(media.includes('compat("tv/relay?id='), "TV playback still depends on the compatibility namespace");
  assert.ok(media.includes('compat("tv/health?ids='), "TV health still depends on the compatibility namespace");
  assert.ok(pages.includes('"/api/v1/news?limit=30"'), "Samachar page still expects the /api/v1/news alias");

  // Production must explicitly bridge only the known transitional Patro surfaces.
  for (const root of ['"tv"', '"fm"', '"samachar"']) assert.ok(shim.includes(root), root);
  assert.ok(shim.includes('pathname === "/api/v1/news"'));
  assert.ok(shim.includes('return "/compat-api/samachar/feed"'));
  assert.ok(shim.includes('response.status !== 404'), "native Cloudflare routes must stay first choice");
  assert.ok(shim.includes('request.method !== "GET" && request.method !== "HEAD"'), "compatibility bridge must stay read-only");
  assert.ok(!shim.includes('path.startsWith("/api/v1/")'), "do not restore a generic /api/v1 catch-all proxy");

  assert.match(wranglerToml, /main\s*=\s*"worker\/connected-entry\.ts"/);
  assert.match(wranglerJson, /"main"\s*:\s*"worker\/connected-entry\.ts"/);
});
