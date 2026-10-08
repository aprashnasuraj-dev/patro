import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
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

test("generated production deploy can discover, require and attach KV plus R2",async()=>{
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
  assert.match(generator,/REQUIRE_QUOTA_CACHE/);
  assert.match(generator,/CACHE KV namespace could not be resolved or provisioned/);
  assert.match(generator,/ARCHIVE R2 bucket could not be resolved/);
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

test("public caches use Cache API and R2 while KV stays small-state only",async()=>{
  const quota=await read("worker/quota-cache.ts");
  const cosmic=await read("worker/cosmic.ts");
  const worker=await read("worker/index.ts");
  const optimized=await read("worker/optimized-entry.ts");
  const jobs=await read("worker/jobs.ts");
  const push=await read("worker/push.ts");
  const siteConfig=await read("worker/admin-console/site-config.ts");

  assert.match(optimized,/quotaCachedResponse/);
  for(const route of [
    "/api/v1/on-this-day","/api/v1/time-machine","/api/v1/today","/api/v1/panchang",
    "/api/v1/holidays","/api/v1/festivals","/api/v1/communities","/api/fm/stations"
  ]) assert.ok(quota.includes(route),`quota cache missing ${route}`);

  assert.match(quota,/calendar-today/);
  assert.match(quota,/ARCHIVE/);
  assert.match(quota,/Cache API -> R2 -> origin/);
  assert.match(quota,/arbitrary query cardinality/);
  assert.match(quota,/text\/calendar/);
  assert.match(quota,/patro-quota-v3/);
  assert.match(quota,/searchParams\.delete\("rev"\)/);
  assert.match(quota,/HISTORY_CACHE_YEAR = "2000"/);
  assert.doesNotMatch(quota,/env\.CACHE|CACHE\?:|readKv|\.CACHE\.put/);

  assert.match(cosmic,/caches\.default/);
  assert.match(cosmic,/COSMIC_R2_PREFIX/);
  assert.match(cosmic,/ARCHIVE/);
  assert.doesNotMatch(cosmic,/env\.CACHE|CACHE\?:|\.CACHE\.put/);

  assert.match(worker,/APOD_R2_PREFIX/);
  assert.match(worker,/caches\.default/);
  assert.doesNotMatch(worker,/env\.CACHE\.(?:get|put)/);

  assert.match(jobs,/warmDailyReferenceCache/);
  assert.match(push,/PUSH_GATE_KEY/);
  assert.match(push,/env\.CACHE\.put/);
  assert.match(push,/julianday\(next_attempt_at\)/);
  assert.match(siteConfig,/kv\?\.put|kv\.put/);
  assert.doesNotMatch(quota,/\/api\/auth|\/api\/push|\/api\/me/);
});

test("annual On This Day primer is edge/R2-only and never depends on KV",async()=>{
  const primer=await read("scripts/cloudflare/prime-history-cache.mjs");
  assert.match(primer,/annual_keys/);
  assert.match(primer,/2000-02-29/);
  assert.match(primer,/unexpectedly used KV/);
  assert.match(primer,/unexpectedly used D1/);
  assert.match(primer,/x-patro-cache/);
  assert.ok(primer.includes('["edge","r2"]'));
  const release=await read(".github/workflows/release-gate.yml");
  assert.match(release,/REQUIRE_QUOTA_CACHE: "1"/);
  assert.match(release,/prime-history-cache\.mjs/);
  assert.match(release,/secrets\.git \|\| secrets\.GIT \|\| secrets\.CLOUDFLARE_API_TOKEN/);
});

async function listTsFiles(relativeDir){
  const dir=path.join(root,relativeDir);
  const entries=await readdir(dir,{withFileTypes:true});
  const out=[];
  for(const entry of entries){
    const relative=path.join(relativeDir,entry.name);
    if(entry.isDirectory())out.push(...await listTsFiles(relative));
    else if(entry.isFile()&&entry.name.endsWith(".ts"))out.push(relative.replaceAll("\\","/"));
  }
  return out;
}

test("Worker KV put operations are limited to approved small-state files",async()=>{
  const allowed=new Set(["worker/push.ts","worker/admin-console/site-config.ts"]);
  const offenders=[];
  for(const relative of await listTsFiles("worker")){
    const source=await read(relative);
    if(/\benv\.CACHE\.put\s*\(|\bkv\?*\.put\s*\(/.test(source)&&!allowed.has(relative))offenders.push(relative);
  }
  assert.deepEqual(offenders,[]);
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
