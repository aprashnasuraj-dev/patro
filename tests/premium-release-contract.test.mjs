import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

const canonicalTools=[
 "/tools/astro","/tools/nepali-typing","/tools/preeti-converter","/tools/bstoad","/tools/adtobs","/tools/calc","/tools/age","/tools/clock","/tools/forex","/tools/gold","/tools/emi","/tools/vat","/tools/units","/tools/words","/tools/incometax","/tools/landconverter","/tools/nepaliqr","/tools/fuelprice","/tools/tithi-reminder","/tools/sait","/tools/baby-names","/tools/janmadin-akhbar","/tools/future-letter","/tools/spell-check","/tools/voice-typing","/tools/ocr","/tools/name-check","/tools/read-aloud","/tools/patro-bot"
];

test("global feature launcher is mounted and exposes the full product while equivalent converter jobs stay consolidated",()=>{
  const main=read("src/main.tsx");
  const launcher=read("src/components/FeatureLauncher.tsx");
  const seo=read("scripts/seo-config.mjs");
  const css=read("src/feature-launcher.css");
  assert.ok(main.includes('import { FeatureLauncher } from "./components/FeatureLauncher"'));
  assert.ok(main.includes("<FeatureLauncher />"));
  assert.ok(main.includes('"./feature-launcher.css"'));
  assert.ok(launcher.includes("event.key.toLowerCase()===\"k\""));
  assert.ok(launcher.includes('event.key==="/"'));
  assert.ok(launcher.includes('event.key==="Escape"'));
  const hrefs=[...launcher.matchAll(/href:\s*"([^"]+)"/g)].map((m)=>m[1]);
  assert.ok(new Set(hrefs).size>=42,`launcher unexpectedly small: ${new Set(hrefs).size}`);
  const consolidated=new Set(["/tools/bstoad","/tools/adtobs"]);
  for(const route of canonicalTools){
    assert.ok(seo.includes(`"${route}"`),`SEO inventory lost canonical tool ${route}`);
    if(!consolidated.has(route))assert.ok(hrefs.includes(route),`launcher lost canonical tool ${route}`);
  }
  assert.ok(hrefs.includes("/convert"),"combined BS ↔ AD converter must remain visible");
  assert.ok(launcher.includes("bs to ad")&&launcher.includes("ad to bs"),"combined converter search must match both directions");
  for(const route of [
    "/time-machine","/on-this-day","/samachar","/fm","/tv","/samudaya","/nepal-sambat/mandala",
    "/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra",
    "/rashifal","/jyotish/china","/jyotish/matchmaking"
  ]) assert.ok(hrefs.includes(route),`launcher lost ${route}`);
  assert.ok(!hrefs.includes("/developers"),"developer/API docs must not be advertised in frontend launcher");
  assert.ok(!hrefs.includes("/tools/api"),"API tool must not be advertised in frontend launcher");
  assert.equal(hrefs.some((href)=>!href||href==="#"),false);
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(css.includes("env(safe-area-inset-bottom)"));
});

test("premium layers upgrade shared tools, media and communities without replacing feature logic",()=>{
  const premium=read("src/premium-experience.css");
  const primitives=read("src/premium-tool-primitives.css");
  const shell=read("src/patro-tools-integration/PatroToolsShell.tsx");
  for(const surface of [".ap-tool-card",".utility-directory-card",".utility-result",".patro-tool-card",".station-card",".tv-stage",".community-control-card"]){assert.ok(premium.includes(surface),`premium surface missing: ${surface}`);}
  assert.ok(premium.includes("prefers-reduced-motion"));
  assert.ok(primitives.includes(".tool-breadcrumbs"));
  assert.ok(primitives.includes(".tool-trust-row"));
  assert.equal(/integration phase|coming soon|coming-soon/i.test(shell),false,"public tool shell must not ship dead placeholder copy");
  assert.ok(shell.includes("ToolUnavailable"),"unknown tool routes need a useful recovery state");
});

test("premium PWA warms the complete high-value product surface",()=>{
  const sw=read("public/sw.js");
  assert.match(sw,/const VERSION = "aafnai-pwa-v\d+"/);
  for(const route of [
    "/time-machine","/on-this-day","/tools/astro","/tools/nepali-typing","/tools/preeti-converter","/samachar","/fm","/tv","/samudaya","/nepal-sambat/mandala",
    "/samudaya/lhosar","/samudaya/tharu","/samudaya/mithila","/samudaya/kirat","/samudaya/hijri","/samudaya/chakra"
  ]) assert.ok(sw.includes(`"${route}"`),`offline core lost ${route}`);
  assert.ok(sw.includes("WARM_LANGUAGE_TOOLS"));
  assert.ok(sw.includes("staleWhileRevalidate"));
  assert.ok(sw.includes("networkFirst"));
  assert.ok(sw.includes("self.skipWaiting()"));
  assert.ok(sw.includes("self.clients.claim()"));
});

test("connected Worker normalizes route SEO for SPA and standalone HTML",()=>{
  const entry=read("worker/connected-entry.ts");
  const seo=read("worker/connected-seo.ts");
  assert.ok(entry.includes('import { rewriteConnectedSeo } from "./connected-seo"'));
  assert.ok((entry.match(/rewriteConnectedSeo\(/g)||[]).length>=3,"SEO rewrite must cover SPA, standalone HTML and fallback HTML");
  assert.ok(seo.includes("og-default.svg"));
  assert.ok(seo.includes("response.status<400"));
  assert.ok(seo.includes('name:BRAND,alternateName:BRAND_EN'));
  assert.ok(seo.includes('"/samudaya/chakra"'));
  assert.ok(seo.includes('"/time-machine"'));
  assert.ok(seo.includes('"/tools/patro-bot"')||seo.includes('"patro-bot"'));
});