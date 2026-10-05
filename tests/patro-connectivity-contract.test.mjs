import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Patro UI connectivity routes are backed by the production Worker entrypoint", () => {
  const media = read("src/media/MediaSuite.tsx");
  const pages = read("src/AafnaiPages.tsx");
  const details = read("src/AafnaiDetailPages.tsx");
  const utilities = read("src/utilities/ReferenceUtilities.tsx");
  const birthday = read("src/patro-tools-integration/JanmadinAkhbarTool.tsx");
  const worker = read("worker/index.ts");
  const publicApi = read("worker/public-api.ts");
  const shim = read("worker/connected-entry.ts");
  const optimized = read("worker/optimized-entry.ts");
  const wranglerJson = read("wrangler.jsonc");

  // Current browser-side contracts. If they change, the Worker must change with them.
  assert.ok(media.includes('compat("tv/catalog?'), "TV catalog still depends on the compatibility namespace");
  assert.ok(media.includes('compat("tv/relay?id='), "TV playback still depends on the compatibility namespace");
  assert.ok(media.includes('compat("tv/health?ids='), "TV health still depends on the compatibility namespace");
  assert.ok(pages.includes('"/api/v1/news?limit=30"'), "Samachar page still expects the /api/v1/news alias");
  assert.ok(utilities.includes('"/api/v1/markets/latest?kind=forex"'), "Forex UI route unexpectedly changed");
  assert.ok(worker.includes('path === "/api/v1/markets/latest"'), "production Worker must preserve the plural Forex alias");
  assert.ok(publicApi.includes('path==="/api/v1/market/latest"'), "native public API should keep the canonical market route");

  for (const endpoint of ["/api/v1/time-machine","/api/v1/on-this-day"]) {
    assert.ok(details.includes(endpoint), `history UI lost ${endpoint}`);
    assert.ok(worker.includes(endpoint) || publicApi.includes(endpoint), `production Worker lost ${endpoint}`);
  }
  assert.ok(birthday.includes('/api/v1/on-this-day?date='), "Birthday Newspaper must use the migrated On This Day endpoint");
  assert.ok(!birthday.includes('/api/on-this-day?'), "Birthday Newspaper must not regress to the retired history endpoint");
  assert.ok(media.includes('"/api/v1/radio/catalog?"'), "FM directory must use the native radio catalog");
  assert.ok(worker.includes("radioCatalogResponse"), "production Worker must retain native radio catalog handling");

  // Production must explicitly bridge only the known transitional Patro surfaces.
  for (const root of ['"tv"', '"fm"', '"samachar"']) assert.ok(shim.includes(root), root);
  assert.ok(shim.includes('pathname === "/api/v1/news"'));
  assert.ok(shim.includes('return "/compat-api/samachar/feed"'));
  assert.ok(shim.includes('response.status !== 404'), "native Cloudflare routes must stay first choice");
  assert.ok(shim.includes('request.method !== "GET" && request.method !== "HEAD"'), "compatibility bridge must stay read-only");
  assert.ok(!shim.includes('path.startsWith("/api/v1/")'), "do not restore a generic /api/v1 catch-all proxy");
  assert.ok(optimized.includes('import connectedWorker from "./connected-entry"'), "optimized entry must preserve the connected Worker as its base runtime");

  assert.match(wranglerJson, /"main"\s*:\s*"worker\/optimized-entry\.ts"/);
  assert.match(wranglerJson, /"name"\s*:\s*"patro"/);
});
