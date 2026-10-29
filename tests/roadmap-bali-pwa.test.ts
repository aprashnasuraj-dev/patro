import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { baliRoute } from "../worker/worldcal/pages/bali-weton";
import { ROADMAP_FLAGS, roadmapFlagsFromEnv } from "../worker/roadmap/flags";

const read=(p:string)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const baseCtx=(baliPwa:boolean)=>({
  site:"https://aafnaipatro.com",
  url:new URL("https://aafnaipatro.com/bali-calendar"),
  path:"/bali-calendar",
  now:new Date("2026-10-29T00:00:00Z"),
  flags:{...ROADMAP_FLAGS,baliPwa,baliMonthGrid:true,baliRerainanSearch:true,baliLearningGuides:true,baliIcsFeeds:true,baliOtonanDualResult:true,baliSubscriptionUi:true,baliPiodalan:true,baliDauhAyu:true,baliPadewasan:true,baliEnglishGuide:true},
} as any);

describe("Bali Calendar dedicated PWA surface",()=>{
  it("keeps the Tika workspace primary even when install capability is off",()=>{
    const r:any=baliRoute(baseCtx(false),[]);
    expect(r?.html).toContain('class="bali-workspace"');
    expect((r?.html.match(/class="tika-cell/g)||[])).toHaveLength(210);
    expect(r?.html).not.toContain('id="bali-install"');
    expect(r?.html).not.toContain('rel="manifest" href="/bali-calendar/manifest.webmanifest"');
  });

  it("integrates installation without restoring generic tool promotion",()=>{
    const r:any=baliRoute(baseCtx(true),[]);
    for(const t of ['class="bali-workspace"','class="tika-grid"','class="bali-mode-nav"','id="bali-install"','rel="manifest" href="/bali-calendar/manifest.webmanifest"','src="/bali-calendar/pwa.js"'])expect(r?.html).toContain(t);
    for(const h of ["/nepalmap","/tools/astro","/time-machine","/tools/nepali-typing"])expect(r?.html).not.toContain('href="'+h+'"');
    expect(r?.html).toContain('href="/advancetools/web-tools/"');
  });

  it("ships traditional-calendar shortcuts inside the dedicated scope",()=>{
    const m=JSON.parse(read("public/bali-calendar/manifest.webmanifest"));
    expect(m.id).toBe("/bali-calendar");
    expect(m.start_url).toBe("/bali-calendar?source=pwa");
    expect(m.scope).toBe("/bali-calendar");
    expect(m.display).toBe("standalone");
    expect(m.shortcuts.every((x:any)=>String(x.url).startsWith("/bali-calendar"))).toBe(true);
    expect(m.shortcuts.map((x:any)=>x.url)).toEqual(expect.arrayContaining([
      "/bali-calendar/palelintangan","/bali-calendar/sasih-saka","/bali-calendar/otonan","/bali-calendar/piodalan","/bali-calendar/hari-raya",
    ]));
  });

  it("persists the last Bali view and caches the multi-mode workspace",()=>{
    const js=read("public/bali-calendar/pwa.js");
    expect(js).toContain('LAST_KEY="bali-calendar:last-path"');
    expect(js).toContain('location.replace(last)');
    expect(js).toContain('register("/bali-calendar-sw.js?rev="+REV');
    expect(js).toContain('REV="bali-calendar-pwa-v2"');
    expect(js).toContain('button.addEventListener("click"');
    const sw=read("public/bali-calendar-sw.js");
    expect(sw).toContain('const CACHE="bali-calendar-shell-v2"');
    for(const path of ["/bali-calendar/palelintangan","/bali-calendar/sasih-saka","/bali-calendar/otonan","/bali-calendar/piodalan","/bali-calendar/hari-raya"])expect(sw).toContain('"'+path+'"');
  });

  it("does not alter the main AafnaiPatro PWA runtime",()=>{
    const rootSw=read("public/sw.js"),rootPwa=read("src/pwa.ts"),rootManifest=JSON.parse(read("public/manifest.webmanifest"));
    expect(rootSw).toContain('const VERSION = "aafnai-pwa-v19"');
    expect(rootSw).not.toContain("BALI_PWA_CORE");
    expect(rootPwa).toContain('const SW_REVISION = "aafnai-pwa-v19"');
    expect(rootManifest.id).toBe("/");
  });

  it("enables all previously verified Bali surfaces in preview and production",()=>{
    expect(ROADMAP_FLAGS.baliPwa).toBe(false);
    const env={
      BALI_MONTH_GRID:"1",BALI_RERAINAN_SEARCH:"1",BALI_LEARNING_GUIDES:"1",BALI_ICS_FEEDS:"1",
      BALI_OTONAN_DUAL_RESULT:"1",BALI_SUBSCRIPTION_UI:"1",BALI_PIODALAN:"1",BALI_DAUH_AYU:"1",
      BALI_PADEWASAN:"1",BALI_ENGLISH_GUIDE:"1",BALI_PWA:"1",
    };
    const flags=roadmapFlagsFromEnv(env);
    for(const key of ["baliMonthGrid","baliRerainanSearch","baliLearningGuides","baliIcsFeeds","baliOtonanDualResult","baliSubscriptionUi","baliPiodalan","baliDauhAyu","baliPadewasan","baliEnglishGuide","baliPwa"] as const)expect(flags[key]).toBe(true);
    const wrangler=read("wrangler.jsonc");
    for(const key of Object.keys(env))expect((wrangler.match(new RegExp('"'+key+'": "1"',"g"))||[])).toHaveLength(2);
  });
});
