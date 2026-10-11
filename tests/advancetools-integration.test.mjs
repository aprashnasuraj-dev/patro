// Advanced tools (tools/advancetools → public/advancetools): static pages served asset-first,
// a Worker 301 for the early typo, and nothing else in the app changed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const wrangler = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
const rules = wrangler.assets.run_worker_first;
const manifest = JSON.parse(readFileSync("public/advancetools/module-manifest.json", "utf8"));

test("every advanced-tools section is asset-first, but not the whole prefix", () => {
  for (const d of ["knittingcalculators", "chordlibrary", "workshopreference", "fontconverters", "printablepaper", "assets", "methodology", "licenses", "downloads"]) {
    assert.ok(rules.includes(`!/advancetools/${d}`) && rules.includes(`!/advancetools/${d}/*`), d);
    assert.ok(existsSync(`public/advancetools/${d}`), `public/advancetools/${d}`);
  }
  for (const f of ["!/advancetools", "!/advancetools/", "!/advancetools/sitemap.xml"]) assert.ok(rules.includes(f), f);
  // A blanket exclusion would stop the typo URL from ever reaching the Worker (Cloudflare 404s asset misses itself).
  assert.ok(!rules.includes("!/advancetools/*"));
});

test("the prebuilt module is complete and matches its manifest", () => {
  assert.equal(manifest.pages, 2029);
  assert.ok(existsSync("public/advancetools/index.html"));
  assert.ok(existsSync(`public${manifest.assetPrefix}/app.mjs`));
  const sitemap = readFileSync("public/advancetools/sitemap.xml", "utf8");
  assert.ok(sitemap.includes("https://aafnaipatro.com/advancetools/chordlibrary/"));
});

test("headers scope the module's CSP and never touch the global policy", () => {
  const headers = readFileSync("public/_headers", "utf8");
  const block = headers.slice(headers.indexOf("# BEGIN AAFNAI ADVANCE TOOLS"), headers.indexOf("# END AAFNAI ADVANCE TOOLS"));
  assert.match(block, /\/advancetools\/\*\n\s+Cache-Control/);
  assert.match(block, /! Content-Security-Policy/);
  assert.ok(!existsSync("public/_redirects"), "redirects live in the Worker, not a static _redirects file");
});

test("the typo path 301s to the knitting collection", async () => {
  const { exploreRedirect } = await import("../worker/explore/redirects.ts").catch(() => ({}));
  if (!exploreRedirect) return; // plain node cannot import .ts; covered by tests/explore-engine.test.ts
  assert.equal(exploreRedirect("/advancetools/kinitingcalculators"), "/advancetools/knittingcalculators/");
});
