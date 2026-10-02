import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(relative)=>readFile(path.join(root,relative),"utf8");
const json=async(relative)=>JSON.parse(await read(relative));

test("Cloudflare first-deploy readiness is the canonical Worker contract",async()=>{
  const config=await json("wrangler.jsonc");
  assert.equal(config.name,"patro");
  assert.equal(config.main,"worker/connected-entry.ts");
  assert.equal(config.preview_urls,false);
  assert.equal(config.assets?.directory,"./dist");
  assert.ok((config.d1_databases||[]).some((entry)=>entry?.binding==="DB"),"missing DB binding");
  assert.ok((config.routes||[]).some((entry)=>entry?.pattern==="aafnaipatro.com"&&entry?.custom_domain===true),"missing aafnaipatro.com custom domain");
});

test("Worker entry and production dist exist",async()=>{
  await assert.doesNotReject(access(path.join(root,"worker/connected-entry.ts")));
  await assert.doesNotReject(access(path.join(root,"dist")));
});

test("KV remains optional for first deploy",async()=>{
  const config=await json("wrangler.jsonc");
  assert.ok(config.kv_namespaces===undefined||Array.isArray(config.kv_namespaces));
});
