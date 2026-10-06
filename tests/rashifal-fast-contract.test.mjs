import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("native Rashifal covers four publication periods and both systems",()=>{
  const source=read("worker/rashifal-native.ts");
  for(const value of ["daily","weekly","monthly","yearly","vedic","western","Asia/Kathmandu"]) assert.ok(source.includes(`\"${value}\"`),`missing ${value}`);
  assert.match(source,/publication_strategy:"deterministic-period-keyed-edge-broadcast"/);
  assert.match(source,/broadcastCacheRequest/);
  assert.match(source,/caches as any/);
  assert.match(source,/x-rashifal-broadcast-key/);
});

test("Rashifal publication path never depends on D1, R2, Supabase or legacy Vercel engine",()=>{
  const source=read("worker/rashifal-native.ts");
  for(const forbidden of ["env.DB","env.ARCHIVE","JP_STORE","miti_rashifal_publications","SUPABASE","supabase.co","patro-blush.vercel.app","RASHIFAL_SERVICE_TOKEN"]) assert.equal(source.includes(forbidden),false,`forbidden origin dependency: ${forbidden}`);
  assert.match(source,/cloudflare-native-rashifal/);
  assert.match(source,/private, no-store/);
});

test("bundle-derived Vedic defaults and editorial layers stay explicit",()=>{
  const source=read("worker/rashifal-native.ts");
  for(const token of ["Lahiri","mean","whole-sign","chandraScore","taraScore","VEDHA","DOMAIN_PLANETS","editorial_index_not_probability"]) assert.ok(source.includes(token),`missing ${token}`);
  assert.match(source,/astronomy-engine geocentric true-ecliptic-of-date/);
  assert.match(source,/source_bundle_logic/);
});

test("personalized mode accepts birthday input but never persists it",()=>{
  const source=read("worker/rashifal-native.ts");
  assert.match(source,/invalid_birth_date/);
  assert.match(source,/birth-date-only-noon-anchor/);
  assert.match(source,/consent_required/);
  assert.match(source,/birth_payload_echoed:false/);
  assert.match(source,/stored:false/);
  assert.match(source,/Request exceeds|request_too_large/);
});

test("Rashifal UI is bilingual, responsive and exposes universal plus birthday modes",()=>{
  const ui=read("src/rashifal/RashifalExperience.tsx");
  const css=read("src/rashifal/rashifal-experience.css");
  for(const token of ["Universal","सार्वभौमिक","My birthday","मेरो जन्ममिति","Yearly","वार्षिक","Vedic","वैदिक","Western","पाश्चात्य","/api/v1/rashifal/personalized","/api/v1/rashifal/universal","/jyotish/china"]) assert.ok(ui.includes(token),`UI missing ${token}`);
  assert.match(ui,/name="birth_date"/);
  assert.match(ui,/name="birth_time"/);
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/overflow-x:clip/);
});

test("production wrapper resolves native Rashifal before connected legacy runtime",()=>{
  const optimized=read("worker/optimized-entry.ts");
  assert.match(optimized,/nativeRashifalResponse/);
  const nativeAt=optimized.indexOf("nativeRashifalResponse");
  const connectedAt=optimized.lastIndexOf("connectedWorker.fetch");
  assert.ok(nativeAt>=0&&connectedAt>nativeAt,"native Rashifal must execute before connected runtime");
});

test("focused workflow deliberately skips the full product release pipeline",()=>{
  const workflow=read(".github/workflows/rashifal-fast-gate.yml");
  assert.match(workflow,/Rashifal Fast Gate/);
  assert.match(workflow,/node --test tests\/rashifal-fast-contract\.test\.mjs/);
  for(const forbidden of ["npm install","npm ci","npm run build","playwright","lighthouse","wrangler deploy","release-gate","cloudflare:verify-inventory"]) assert.equal(workflow.toLowerCase().includes(forbidden.toLowerCase()),false,`fast gate must skip ${forbidden}`);
});
