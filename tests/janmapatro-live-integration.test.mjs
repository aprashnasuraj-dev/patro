import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const router=readFileSync("src/PatroRouter.tsx","utf8");
const ui=readFileSync("src/jyotish/JanmaPatroSuite.tsx","utf8");
const css=readFileSync("src/jyotish/janmapatro.css","utf8");
const connected=readFileSync("worker/connected-entry.ts","utf8");
const seo=readFileSync("worker/connected-seo.ts","utf8");
const seoConfig=readFileSync("scripts/seo-config.mjs","utf8");
const launcher=readFileSync("src/components/FeatureLauncher.tsx","utf8");

test("canonical Janma Patro and Guna Milan routes mount the live suite",()=>{
 assert.match(router,/["']\/janmapatro["']/);
 assert.match(router,/["']\/janmapatro\/milan\.html["']/);
 assert.match(router,/JanmaPatroSuite/);
 assert.match(connected,/["']\/janmapatro["']/);
 assert.match(connected,/["']\/janmapatro\/milan\.html["']/);
 assert.match(connected,/startsWith\(["']\/janmapatro["']\)/);
});

test("live UI wires bundle share, name matching, exports and print",()=>{
 assert.match(ui,/createJanmaPatroShareUrl/);
 assert.match(ui,/readJanmaPatroShareState/);
 assert.match(ui,/calculateNameGuna/);
 assert.match(ui,/html2pdf\.js/);
 assert.match(ui,/html-to-image/);
 assert.match(ui,/window\.print\(\)/);
 assert.match(ui,/नामबाट/);
 assert.match(ui,/चन्द्र कुण्डली/);
 assert.match(css,/@page\{size:A4/);
 assert.match(css,/max-width:620px/);
});

test("legacy Jyotish URLs canonicalize to new module URLs while launcher and sitemap use canonical routes",()=>{
 assert.match(seo,/"\/jyotish\/china":"\/janmapatro"/);
 assert.match(seo,/"\/jyotish\/matchmaking":"\/janmapatro\/milan\.html"/);
 assert.match(seoConfig,/"\/janmapatro", "\/janmapatro\/milan\.html"/);
 assert.match(launcher,/href:"\/janmapatro"/);
 assert.match(launcher,/href:"\/janmapatro\/milan\.html"/);
});

test("Janma share implementation stays browser-local and the UI has no server save dependency",()=>{
 assert.doesNotMatch(ui,/\/janmapatro\/api\//);
 assert.doesNotMatch(ui,/JP_STORE/);
 assert.doesNotMatch(ui,/env\.(?:DB|ARCHIVE|CACHE)/);
});
