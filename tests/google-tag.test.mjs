import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { GOOGLE_TAG_ID, GOOGLE_TAG_INIT, GOOGLE_TAG_HASH, installGoogleTag, googleTagCsp } from "../shared/google-tag.ts";
import { installGoogleTagInBuild } from "../scripts/install-google-tag.mjs";

const source = '<!doctype html><html><head><meta charset="utf-8"><title>Test</title></head><body>नेपाल</body></html>';
function checkTag(html) {
  assert.equal((html.match(/googletagmanager\.com\/gtag\/js\?id=G-KWLDWTSK14/g) || []).length, 1);
  assert.equal((html.match(/gtag\('config', 'G-KWLDWTSK14'\)/g) || []).length, 1);
  assert.match(html, /<head>\s*<!-- Google tag \(gtag\.js\) -->\s*<script/);
  assert.ok(html.includes('नेपाल'));
}

test("tag is first in head and repeat installation does not duplicate or change it", () => {
  const html = installGoogleTag(source);
  checkTag(html);
  assert.equal(installGoogleTag(html), html);
  assert.equal(installGoogleTag("plain text"), "plain text");
});

test("unmanaged tags fail the build rather than double-counting page views", () => {
  assert.throws(() => installGoogleTag(source.replace("</head>", '<script src="https://www.googletagmanager.com/gtag/js?id=G-OLD"></script></head>')), /Unmanaged/);
});

test("strict CSP permits exactly the supplied initializer without enabling arbitrary inline scripts", () => {
  assert.equal(GOOGLE_TAG_HASH, `'sha256-${createHash("sha256").update(GOOGLE_TAG_INIT).digest("base64")}'`);
  const csp = googleTagCsp("default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'");
  assert.ok(csp.includes(GOOGLE_TAG_HASH));
  assert.ok(!csp.includes("'unsafe-inline'"));
  assert.ok(csp.includes("https://*.google-analytics.com"));
  assert.ok(csp.includes("https://static.cloudflareinsights.com"));
  assert.ok(csp.includes("https://cloudflareinsights.com"));
  assert.match(csp, /connect-src 'self'/);
  assert.equal((csp.match(/https:\/\/static\.cloudflareinsights\.com/g) || []).length, 1);
  assert.ok(csp.includes("object-src 'none'"));
  assert.equal(googleTagCsp(csp), csp);
  assert.match(googleTagCsp("default-src 'self'"), /script-src 'self' https:\/\/www.googletagmanager.com/);
});

test("existing inline scripts and script-src-elem policies remain functional", () => {
  const csp = googleTagCsp("default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-elem 'self'");
  const script = csp.split(";").find(value => value.trim().startsWith("script-src "));
  const elements = csp.split(";").find(value => value.trim().startsWith("script-src-elem "));
  assert.ok(!script.includes("sha256-"));
  assert.ok(elements.includes(GOOGLE_TAG_HASH));
  assert.ok(elements.includes("https://www.googletagmanager.com"));
  assert.ok(elements.includes("https://static.cloudflareinsights.com"));
});

test("static finalizer covers standalone pages, adjusts CSP, and preserves manifest integrity", async () => {
  const root = await mkdtemp(join(tmpdir(), "patro-google-tag-"));
  try {
    await mkdir(join(root, "advancetools"));
    await writeFile(join(root, "index.html"), source);
    await writeFile(join(root, "advancetools/index.html"), source);
    await writeFile(join(root, "advancetools/module-manifest.json"), JSON.stringify({ hashes: { "index.html": "old" }, bytes: 0 }));
    await writeFile(join(root, "_headers"), "/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'\n");
    assert.equal(await installGoogleTagInBuild(root), 2);
    const html = await readFile(join(root, "advancetools/index.html"), "utf8");
    checkTag(html);
    const manifest = JSON.parse(await readFile(join(root, "advancetools/module-manifest.json"), "utf8"));
    assert.equal(manifest.hashes["index.html"], createHash("sha256").update(html).digest("hex"));
    assert.equal(manifest.bytes, Buffer.byteLength(html));
    assert.ok((await readFile(join(root, "_headers"), "utf8")).includes(GOOGLE_TAG_HASH));
    assert.ok((await readFile(join(root, "_headers"), "utf8")).includes("https://static.cloudflareinsights.com"));
    await installGoogleTagInBuild(root);
    assert.equal(await readFile(join(root, "advancetools/index.html"), "utf8"), html);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("static finalizer rejects a deployable HTML document without head", async () => {
  const root = await mkdtemp(join(tmpdir(), "patro-google-tag-bad-"));
  try {
    await mkdir(join(root, "advancetools"));
    await writeFile(join(root, "index.html"), "<!doctype html><html><body>missing head</body></html>");
    await writeFile(join(root, "advancetools/module-manifest.json"), JSON.stringify({ hashes: {}, bytes: 0 }));
    await writeFile(join(root, "_headers"), "/*\n  Content-Security-Policy: default-src 'self'\n");
    await assert.rejects(() => installGoogleTagInBuild(root), /HTML document has no <head>/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("independent HTML Workers bundle the canonical managed Google tag", async () => {
  for (const entry of ["library-release/worker.mjs", "extensions/day-atlas/worker.mjs"]) {
    const bundle = await build({ entryPoints: [entry], bundle: true, write: false, format: "esm", platform: "browser", logLevel: "silent" });
    const code = bundle.outputFiles[0].text;
    assert.ok(code.includes(GOOGLE_TAG_ID), `${entry} bundle is missing ${GOOGLE_TAG_ID}`);
    assert.ok(code.includes("data-patro-google-tag"), `${entry} bundle is missing managed tag marker`);
    assert.ok(code.includes("googletagmanager.com/gtag/js"), `${entry} bundle is missing gtag loader`);
  }
});

test("real Workers HTMLRewriter adds dynamic tags and removes the prebuilt copy", async () => {
  const bundle = await build({ stdin: { contents: `
    import { googleTagResponse } from './worker/google-tag.ts';
    import { installGoogleTag } from './shared/google-tag.ts';
    export default { fetch(request) {
      const path = new URL(request.url).pathname;
      const html = ${JSON.stringify(source)};
      const response = new Response(path === '/static' ? installGoogleTag(html) : html, {headers: {
        'content-type': path === '/json' ? 'application/json' : 'text/html; charset=utf-8',
        'content-security-policy': "default-src 'self'; script-src 'self'"
      }});
      return googleTagResponse(request, response);
    }};`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "browser" });
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: "2026-09-30" }));
  try {
    for (const path of ["/dynamic", "/static", "/date/2026-10-25"]) {
      const response = await mf.dispatchFetch(`https://example.com${path}`);
      checkTag(await response.text());
      assert.ok(response.headers.get("content-security-policy").includes(GOOGLE_TAG_HASH));
      assert.ok(response.headers.get("content-security-policy").includes("https://static.cloudflareinsights.com"));
      assert.ok(response.headers.get("content-security-policy").includes("https://cloudflareinsights.com"));
    }
    for (const path of ["/json", "/admin", "/api/example"]) {
      const response = await mf.dispatchFetch(`https://example.com${path}`);
      assert.ok(!(await response.text()).includes(GOOGLE_TAG_ID));
    }
  } finally { await mf.dispose(); }
});
