import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const router=readFileSync("src/PatroRouter.tsx","utf8");
const page=readFileSync("src/features/jyotish/JyotishPage.jsx","utf8");
const api=readFileSync("src/features/jyotish/api.js","utf8");
const exporter=readFileSync("src/features/jyotish/export/exporter.js","utf8");
const css=readFileSync("src/features/jyotish/jyotish.css","utf8");
const worker=readFileSync("worker/jyotish-api.ts","utf8");
const optimized=readFileSync("worker/optimized-entry.ts","utf8");
const connected=readFileSync("worker/connected-entry.ts","utf8");
const seo=readFileSync("worker/connected-seo.ts","utf8");
const seoConfig=readFileSync("scripts/seo-config.mjs","utf8");
const launcher=readFileSync("src/components/FeatureLauncher.tsx","utf8");

test("canonical Janma Patro and Guna Milan routes mount the complete Jyotish bundle",()=>{
 assert.match(router,/["']\/janmapatro["']/);
 assert.match(router,/["']\/janmapatro\/milan\.html["']/);
 assert.match(router,/features\/jyotish\/JyotishPage/);
 assert.match(router,/JyotishPage/);
 assert.match(connected,/["']\/janmapatro["']/);
 assert.match(connected,/["']\/janmapatro\/milan\.html["']/);
 assert.match(connected,/startsWith\(["']\/janmapatro["']\)/);
});

test("full live UI exposes china, matching, bilingual mode, name matching and export pipeline",()=>{
 assert.match(page,/ChinaScroll/);
 assert.match(page,/MatchReport/);
 assert.match(page,/calculateNameGuna/);
 assert.match(page,/LanguageToggle/);
 assert.match(page,/encodeShare/);
 assert.match(page,/decodeShare/);
 assert.match(api,/createJanmaPatroShareHash/);
 assert.match(api,/readJanmaPatroShareState/);
 assert.match(exporter,/html-to-image/);
 assert.match(exporter,/jspdf/);
 assert.match(exporter,/window\.print\(\)/);
 assert.match(css,/@media print/);
 assert.match(css,/china-scroll/);
});

test("native Worker exposes Jyotish API without durable storage or shared caching of personal results",()=>{
 assert.match(optimized,/handleJyotishApi/);
 assert.match(worker,/\/api\/jyotish/);
 assert.match(worker,/cache-control': 'private, no-store'/);
 assert.doesNotMatch(worker,/env\.(?:DB|ARCHIVE|CACHE)/);
 assert.doesNotMatch(worker,/caches\.default/);
});

test("legacy Jyotish URLs canonicalize while launcher and sitemap use canonical routes",()=>{
 assert.match(seo,/"\/jyotish\/china":"\/janmapatro"/);
 assert.match(seo,/"\/jyotish\/matchmaking":"\/janmapatro\/milan\.html"/);
 assert.match(seoConfig,/"\/janmapatro", "\/janmapatro\/milan\.html"/);
 assert.match(launcher,/href:"\/janmapatro"/);
 assert.match(launcher,/href:"\/janmapatro\/milan\.html"/);
});

test("normal share implementation stays browser-local",()=>{
 assert.doesNotMatch(api,/\/janmapatro\/api\//);
 assert.doesNotMatch(api,/JP_STORE/);
 assert.doesNotMatch(api,/location\.hash.*fetch|fetch.*location\.hash/);
});
