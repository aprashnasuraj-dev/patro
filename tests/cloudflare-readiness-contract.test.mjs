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
  assert.equal(config.main,"worker/optimized-entry.ts");
  assert.equal(config.preview_urls,false);
  assert.equal(config.assets?.directory,"./dist");
  assert.ok((config.d1_databases||[]).some((entry)=>entry?.binding==="DB"),"missing DB binding");
  assert.ok((config.routes||[]).some((entry)=>entry?.pattern==="aafnaipatro.com"&&entry?.custom_domain===true),"missing aafnaipatro.com custom domain");
});

test("Worker entry and production dist exist",async()=>{
  await assert.doesNotReject(access(path.join(root,"worker/optimized-entry.ts")));
  await assert.doesNotReject(access(path.join(root,"worker/connected-entry.ts")));
  await assert.doesNotReject(access(path.join(root,"worker/quota-cache.ts")));
  await assert.doesNotReject(access(path.join(root,"dist")));
});

test("KV and R2 remain optional but generated deploy can attach both",async()=>{
  const config=await json("wrangler.jsonc");
  assert.ok(config.kv_namespaces===undefined||Array.isArray(config.kv_namespaces));
  assert.ok(config.r2_buckets===undefined||Array.isArray(config.r2_buckets));
  const generator=await read("scripts/prepare-cloudflare-config.mjs");
  assert.match(generator,/CF_KV_NAMESPACE_ID/);
  assert.match(generator,/binding:"CACHE"/);
  assert.match(generator,/CF_R2_BUCKET_NAME/);
  assert.match(generator,/binding:"ARCHIVE"/);
  assert.match(generator,/patro-runtime-cache/);
  assert.match(generator,/\/r2\/buckets/);
});

test("Cloudflare deploy generates environment-aware bindings before Wrangler",async()=>{
  const pkg=await json("package.json");
  assert.equal(pkg.scripts?.["deploy:cloudflare"],"npm run cloudflare:config && wrangler deploy --config wrangler.generated.jsonc");
  assert.equal(pkg.cloudflare?.build_command,"npm run build");
  assert.equal(pkg.cloudflare?.deploy_command,"npm run cloudflare:config && npx wrangler deploy --config wrangler.generated.jsonc");
  assert.equal(pkg.cloudflare?.config,"wrangler.jsonc");
  assert.ok(pkg.cloudflare?.bindings?.CACHE);
  assert.ok(pkg.cloudflare?.bindings?.ARCHIVE);
});

test("public D1 hot paths are quota cached without caching private routes",async()=>{
  const quota=await read("worker/quota-cache.ts");
  const optimized=await read("worker/optimized-entry.ts");
  const jobs=await read("worker/jobs.ts");
  const push=await read("worker/push.ts");
  assert.match(optimized,/quotaCachedResponse/);
  for(const route of [
    "/api/v1/on-this-day","/api/v1/time-machine","/api/v1/today","/api/v1/panchang",
    "/api/v1/holidays","/api/v1/festivals","/api/v1/communities","/api/fm/stations"
  ]) assert.ok(quota.includes(route),`quota cache missing ${route}`);
  assert.match(quota,/calendar-today/);
  assert.match(quota,/ARCHIVE/);
  assert.match(quota,/CACHE/);
  assert.match(quota,/arbitrary query cardinality/);
  assert.match(quota,/text\/calendar/);
  assert.match(jobs,/warmDailyReferenceCache/);
  assert.match(push,/PUSH_GATE_KEY/);
  assert.match(push,/julianday\(next_attempt_at\)/);
  assert.doesNotMatch(quota,/\/api\/auth|\/api\/push|\/api\/me/);
});

test("legacy Pages, static redirect and deploy-wrapper artifacts are absent",async()=>{
  const obsolete=[
    "_routes.json",
    "public/_routes.json",
    "_redirects",
    "public/_redirects",
    "dist/_redirects",
    "wrangler.toml",
    "scripts/deploy-cloudflare.mjs"
  ];
  for(const relative of obsolete){
    await assert.rejects(access(path.join(root,relative)),(error)=>error?.code==="ENOENT",`${relative} must not exist`);
  }
});

test("legacy public aliases are handled by Worker redirects instead of static asset rules",async()=>{
  const worker=await read("worker/connected-entry.ts");
  assert.match(worker,/const LEGACY_REDIRECTS/);
  assert.match(worker,/"\/astro": "\/tools\/astro"/);
  assert.match(worker,/"\/jyotish\/janma-patro": "\/jyotish\/china"/);
  assert.match(worker,/"\/nepal-sambat": "\/nepal-sambat\/mandala"/);
  assert.match(worker,/legacyRedirectResponse\(request\)/);
});
