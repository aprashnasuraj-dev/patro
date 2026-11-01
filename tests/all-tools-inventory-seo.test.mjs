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
