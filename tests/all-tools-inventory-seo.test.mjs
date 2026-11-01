import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadClientTools } from "../scripts/client-tools/catalog.mjs";
import { freeToolName, freeToolSeoTitle, freeToolDescription } from "../scripts/tool-growth/free-seo.mjs";

const readJson = async path => JSON.parse(await readFile(new URL("../" + path, import.meta.url), "utf8"));
test("all 3,091 canonical tool/reference pages are in the SEO coverage registry", async () => {
  const client = await loadClientTools();
  const mm530 = (await readJson("src/mm530/mm530-registry.json")).tools;
  const advanced = (await readJson("public/advancetools/module-manifest.json")).routes.filter(row => row.kind !== "hub");
  assert.equal(client.length, 550);
  assert.equal(mm530.length, 530);
  assert.equal(advanced.length, 2011);
  const all = [
    ...client.map(row => ({ title: row.h1, description: row.meta_description, route: row.slug })),
    ...mm530.map(row => ({ title: row.title, description: row.summary, route: row.route })),
    ...advanced.map(row => ({ title: row.title, description: row.title + " is an interactive AafnaiPatro tool or reference page.", route: row.path }))
  ];
  assert.equal(all.length, 3091);
  const paths = new Set();
  const names = new Set();
  for (const tool of all) {
    assert.ok(tool.route.startsWith("/"), "Invalid tool route: " + tool.route);
    assert.ok(!paths.has(tool.route), "Duplicate canonical path: " + tool.route);
    paths.add(tool.route);
    assert.ok(!names.has(tool.title.toLowerCase()), "Duplicate visible tool title: " + tool.title);
    names.add(tool.title.toLowerCase());
    const free = freeToolName(tool.title);
    assert.ok(/^free\s/i.test(free));
    assert.ok(freeToolSeoTitle(tool.title).includes(free));
    const desc = freeToolDescription(tool.description);
    assert.ok(desc.length <= 160, "Oversize meta: " + tool.route);
    assert.ok(/\bfree\b/i.test(desc), "Free availability missing: " + tool.route);
  }
});

test("preserves existing Cloudflare production redirects while adding tool repairs", async () => {
  const raw = await readFile(new URL("../public/_redirects",import.meta.url),"utf8");
  const lines=raw.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith("#"));
  assert.ok(lines.length>=347,"337 production redirects plus 10 tool fixes must be preserved");
  const from=new Set();
  for(const line of lines){
    const fields=line.split(/\s+/);
    assert.equal(fields.length,3,"Invalid redirect line: "+line);
    assert.equal(fields[2],"301","Keep permanent canonical redirects: "+line);
    assert.ok(!from.has(fields[0]),"Duplicate source redirect "+fields[0]);
    assert.notEqual(fields[0],fields[1],"Self redirect "+fields[0]);
    from.add(fields[0]);
  }
  for(const path of ["/tools/land","/tools/fuel","/tools/typingtools","/tools/qr","/tools/convert","/tools/samudaya","/advancetools/web-tools/utilities/","/advancetools/web-tools/planners/","/advancetools/web-tools/timers/","/advancetools/web-tools/editors/"])
    assert.ok(from.has(path),"Missing repaired obsolete route "+path);
});

test("preserves Google tag and security headers present in the live Worker", async () => {
  const raw=await readFile(new URL("../public/_headers",import.meta.url),"utf8");
  assert.ok(raw.includes("https://www.googletagmanager.com"),"Google tag CSP source lost");
  assert.ok(raw.includes("https://*.google-analytics.com"),"Analytics collect endpoint blocked");
  assert.ok(raw.includes("X-Content-Type-Options: nosniff"),"Browser MIME guard lost");
  assert.ok(raw.includes("Strict-Transport-Security:"),"HSTS security header lost");
  assert.ok(raw.includes("/advancetools/*"),"Advanced Tools header family lost");
});
