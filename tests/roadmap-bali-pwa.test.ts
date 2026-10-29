import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { baliRoute } from "../worker/worldcal/pages/bali-weton";
import { ROADMAP_FLAGS, roadmapFlagsFromEnv } from "../worker/roadmap/flags";
const read=(p:string)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
describe("Bali Calendar dedicated PWA surface",()=>{
it("stays off by default and renders the rich Bali face only when enabled",()=>{expect(ROADMAP_FLAGS.baliPwa).toBe(false);const ctx:any={site:"https://aafnaipatro.com",url:new URL("https://aafnaipatro.com/bali-calendar"),path:"/bali-calendar",now:new Date("2026-10-29T00:00:00Z"),flags:{...ROADMAP_FLAGS,baliPwa:true,baliMonthGrid:true,baliPiodalan:true,baliPadewasan:true,baliDauhAyu:true}};const r:any=baliRoute(ctx,[]);for(const t of ['class="bali-native-shell"','class="bali-emblem-ring"','id="bali-install"','rel="manifest" href="/bali-calendar/manifest.webmanifest"','src="/bali-calendar/pwa.js"'])expect(r?.html).toContain(t);for(const h of ["/tools","/nepalmap","/tools/astro","/time-machine","/tools/nepali-typing","/weton"])expect(r?.html).toContain('href="'+h+'"')});
it("uses a distinct install identity but keeps AafnaiPatro routes in scope",()=>{const m=JSON.parse(read("public/bali-calendar/manifest.webmanifest"));expect(m.id).toBe("/bali-calendar");expect(m.start_url).toBe("/bali-calendar?source=pwa");expect(m.scope).toBe("/");expect(m.display).toBe("standalone");expect(m.shortcuts.some((x:any)=>x.url==="/tools")).toBe(true)});
it("only prompts after a user click and reuses the root service worker",()=>{const js=read("public/bali-calendar/pwa.js");expect(js).toContain('button.addEventListener("click"');expect(js).toContain("await promptEvent.prompt()");expect(js).toContain('register("/sw.js?rev=aafnai-pwa-v20"');expect(js).toContain('postMessage({type:"WARM_BALI_PWA"})')});

it("enables only the verified runtime PWA flag through Cloudflare env",()=>{
  expect(ROADMAP_FLAGS.baliPwa).toBe(false);
  expect(roadmapFlagsFromEnv({BALI_PWA:"1"}).baliPwa).toBe(true);
  const wrangler=read("wrangler.jsonc");
  expect((wrangler.match(/"BALI_PWA": "1"/g)||[])).toHaveLength(2);
});
});
