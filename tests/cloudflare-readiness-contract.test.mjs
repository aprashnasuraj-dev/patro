import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."); const read=(relative)=>readFile(path.join(root,relative),"utf8"); const json=async(relative)=>JSON.parse(await read(relative));

test("documented Cloudflare Worker lifecycle commands exist",async()=>{const pkg=await json("package.json");for(const name of ["build","cloudflare:validate","cloudflare:verify-snapshot","cloudflare:verify-d1-remote","cloudflare:verify-inventory","cloudflare:smoke","deploy:cloudflare:bootstrap","deploy:cloudflare"]){assert.equal(typeof pkg.scripts?.[name],"string",`missing package script: ${name}`);assert.ok(pkg.scripts[name].trim(),`empty package script: ${name}`);}assert.equal(pkg.cloudflare?.production_branch,"main");assert.equal(pkg.cloudflare?.deploy_command,"npm run deploy:cloudflare");assert.equal(pkg.cloudflare?.config,"wrangler.jsonc");assert.equal(pkg.scripts?.["deploy:pages"],undefined);});

test("Worker deployment scripts referenced by lifecycle commands exist",async()=>{for(const relative of ["scripts/deploy-cloudflare.mjs","scripts/bootstrap-cloudflare.mjs","scripts/ensure-d1-content.mjs","scripts/validate-cloudflare.mjs","scripts/generate-d1-migrations.mjs","scripts/verify-d1-remote.mjs","scripts/verify-migration-inventory.mjs","scripts/cutover-smoke.mjs"])await assert.doesNotReject(access(path.join(root,relative)),relative);});

test("migration handoff documents exist",async()=>{for(const relative of ["docs/INVENTORY.md","PLAN.md","DEPLOY.md","CHANGELOG.md","docs/CLOUDFLARE_GIT_DEPLOY.md","docs/CLOUDFLARE_MIGRATION_PARITY.md","cloudflare/migration-manifest.json","cloudflare/source-runtime-manifest.json"])await assert.doesNotReject(access(path.join(root,relative)),relative);});

test("production contract is one Worker with Static Assets and D1",async()=>{const config=await json("wrangler.jsonc");assert.equal(config.name,"patro");assert.equal(config.main,"worker/connected-entry.ts");assert.equal(config.preview_urls,false);const route=(config.routes||[]).find((entry)=>entry.pattern==="aafnaipatro.com");assert.ok(route);assert.equal(route.custom_domain,true);assert.equal(config.assets?.directory,"./dist");assert.equal(config.assets?.binding,"ASSETS");const db=(config.d1_databases||[]).find((entry)=>entry.binding==="DB");assert.ok(db);assert.equal(db.database_name,"patro");assert.ok(!Array.isArray(config.services)||!config.services.some((item)=>item?.binding==="PATRO_API"));});

test("optional KV is not a first-deploy requirement",async()=>{const config=await json("wrangler.jsonc");const pkg=await json("package.json");assert.ok(!config.kv_namespaces||Array.isArray(config.kv_namespaces));assert.match(String(pkg.cloudflare?.bindings?.CACHE||""),/Optional/i);const bootstrap=await read("scripts/bootstrap-cloudflare.mjs");assert.ok(!bootstrap.includes("First native Cloudflare deployment requires CF_D1_DATABASE_ID and CF_KV_NAMESPACE_ID"));});

test("retired Pages deploy surface is absent",async()=>{const pkg=await json("package.json");assert.equal(pkg.scripts?.["deploy:pages"],undefined);await assert.rejects(access(path.join(root,"wrangler.pages.jsonc")));});

test("README and runbook only document Worker lifecycle commands that package.json exposes",async()=>{const [pkg,readme,runbook]=await Promise.all([json("package.json"),read("README.md"),read("docs/CLOUDFLARE_GIT_DEPLOY.md")]);for(const command of ["deploy:cloudflare:bootstrap","deploy:cloudflare","cloudflare:validate","cloudflare:verify-d1-remote","cloudflare:smoke"]){const marker=`npm run ${command}`;if(readme.includes(marker)||runbook.includes(marker))assert.equal(typeof pkg.scripts?.[command],"string",`documented command has no package script: ${marker}`);}});
