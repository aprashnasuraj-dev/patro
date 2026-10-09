import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = await mkdtemp(join(tmpdir(), "patro-astronomy-"));
const output = join(dir, "apod.mjs");
await build({ entryPoints: ["worker/apod.ts"], outfile: output, bundle: true, platform: "node", format: "esm" });
const { apod } = await import(pathToFileURL(output));
test.after(() => rm(dir, { recursive: true, force: true }));

function kv() {
  const values = new Map(), writes = [];
  return { writes, async get(key) { const value=values.get(key); return value ? {text:async()=>JSON.stringify(value)} : null; }, async put(key, value, options) { values.set(key, JSON.parse(value)); writes.push({ key, options, value:JSON.parse(value) }); } };
}
test("parallel APOD/cosmic callers share upstream work; later callers use R2", async () => {
  const saved = globalThis.fetch, cache = kv(), env = { ARCHIVE: cache };
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ date: "2026-10-06", title: "Sky", url: "https://example.com/sky.jpg" }); };
  try {
    const [a,b] = await Promise.all([apod(env,"2026-10-06"),apod(env,"2026-10-06")]);
    assert.equal(calls,1); assert.equal(a.is_fallback,false); assert.deepEqual(a,b);
    assert.equal((Date.parse(cache.writes[0].value.expires_at)-Date.parse(cache.writes[0].value.stored_at))/1000,30*86400);
    await apod(env,"2026-10-06"); assert.equal(calls,1);
    // A different edge/environment still consumes the shared completed cache.
    await apod({ ARCHIVE: cache },"2026-10-06"); assert.equal(calls,1);
  } finally { globalThis.fetch = saved; }
});
test("unpublished-day failure is negatively cached for 15 minutes, not a full day", async () => {
  const saved = globalThis.fetch, cache = kv(), env = { ARCHIVE: cache };
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("unpublished",{status:400}); };
  try {
    const [a,b] = await Promise.all([apod(env,"2026-10-07"),apod(env,"2026-10-07")]);
    assert.equal(calls,2); assert.equal(a.is_fallback,true); assert.deepEqual(a,b);
    assert.equal((Date.parse(cache.writes[0].value.expires_at)-Date.parse(cache.writes[0].value.stored_at))/1000,900);
    await apod(env,"2026-10-07"); assert.equal(calls,2);
  } finally { globalThis.fetch = saved; }
});
test("dates and environment bindings do not share unrelated results", async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async url => Response.json({ date: new URL(url).searchParams.get("date"), url:"https://example.com/image.jpg" });
  try {
    const [a,b] = await Promise.all([apod({ARCHIVE:kv()},"2026-10-05"),apod({ARCHIVE:kv()},"2026-10-06")]);
    assert.equal(a.date,"2026-10-05"); assert.equal(b.date,"2026-10-06");
  } finally { globalThis.fetch = saved; }
});
