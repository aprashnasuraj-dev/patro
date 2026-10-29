import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { baliRoute } from "../worker/worldcal/pages/bali-weton";
import { ROADMAP_FLAGS, roadmapFlagsFromEnv } from "../worker/roadmap/flags";
const read=(p:string)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
describe("Bali Calendar dedicated PWA surface",()=>{
it("stays off by default and renders the rich Bali face only when enabled",()=>{expect(ROADMAP_FLAGS.baliPwa).toBe(false);const ctx:any={site:"https://aafnaipatro.com",url:new URL("https://aafnaipatro.com/bali-calendar"),path:"/bali-calendar",now:new Date("2026-10-29T00:00:00Z"),flags:{...ROADMAP_FLAGS,baliPwa:true,baliMonthGrid:true,baliPiodalan:true,baliPadewasan:true,baliDauhAyu:true}};const r:any=baliRoute(ctx,[]);for(const t of ['class="bali-native-shell"','class="bali-emblem-ring"','id="bali-install"','rel="manifest" href="/bali-calendar/manifest.webmanifest"','src="/bali-calendar/pwa.js"'])expect(r?.html).toContain(t);for(const h of ["/tools","/nepalmap","/tools/astro","/time-machine","/tools/nepali-typing","/weton"])expect(r?.html).toContain('href="'+h+'"')});
it("uses a distinct install identity but keeps AafnaiPatro routes in scope",()=>{const m=JSON.parse(read("public/bali-calendar/manifest.webmanifest"));expect(m.id).toBe("/bali-calendar");expect(m.start_url).toBe("/bali-calendar?source=pwa");expect(m.scope).toBe("/bali-calendar");expect(m.display).toBe("standalone");expect(m.shortcuts.every((x:any)=>String(x.url).startsWith("/bali-calendar"))).toBe(true)});
it("only prompts after a user click and uses a Bali-scoped service worker",()=>{const js=read("public/bali-calendar/pwa.js");expect(js).toContain('button.addEventListener("click"');expect(js).toContain("await promptEvent.prompt()");expect(js).toContain('register("/bali-calendar-sw.js?rev=bali-calendar-pwa-v1"');expect(js).toContain('scope:"/bali-calendar"');expect(js).toContain('postMessage({type:"WARM_BALI_PWA"})')});
it("does not alter the main AafnaiPatro PWA runtime",()=>{
  const rootSw=read("public/sw.js"),rootPwa=read("src/pwa.ts"),rootManifest=JSON.parse(read("public/manifest.webmanifest"));
  expect(rootSw).toContain('const VERSION = "aafnai-pwa-v19"');
  expect(rootSw).not.toContain("BALI_PWA_CORE");
  expect(rootSw).not.toContain("WARM_BALI_PWA");
  expect(rootPwa).toContain('const SW_REVISION = "aafnai-pwa-v19"');
  expect(rootManifest.id).toBe("/");expect(rootManifest.start_url).toBe("/?source=pwa");
  const baliSw=read("public/bali-calendar-sw.js");
  expect(baliSw).toContain('const CACHE="bali-calendar-shell-v1"');
  expect(baliSw).toContain('url.pathname.startsWith("/bali-calendar")');
});

it("enables only the verified runtime PWA flag through Cloudflare env",()=>{
  expect(ROADMAP_FLAGS.baliPwa).toBe(false);
  expect(roadmapFlagsFromEnv({BALI_PWA:"1"}).baliPwa).toBe(true);
  const wrangler=read("wrangler.jsonc");
  expect((wrangler.match(/"BALI_PWA": "1"/g)||[])).toHaveLength(2);
});
});
