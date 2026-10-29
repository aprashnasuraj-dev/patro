import { describe, expect, it } from "vitest";
import { palelintanganMatrix, pawukon, pawukonCycle } from "../worker/worldcal/engines/pawukon";
import { isoToJdn } from "../worker/worldcal/dates";
import { baliRoute, rerainanSearch } from "../worker/worldcal/pages/bali-weton";
import { ROADMAP_FLAGS } from "../worker/roadmap/flags";

function fnv1a(text:string){
  let h=0x811c9dc5;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}
  return h>>>0;
}

const fullFlags={...ROADMAP_FLAGS,baliPwa:true,baliMonthGrid:true,baliRerainanSearch:true,baliLearningGuides:true,baliIcsFeeds:true,baliOtonanDualResult:true,baliSubscriptionUi:true,baliPiodalan:true,baliDauhAyu:true,baliPadewasan:true,baliEnglishGuide:true};
function ctx(path="/bali-calendar"){
  return {site:"https://aafnaipatro.com",url:new URL("https://aafnaipatro.com"+path),path,now:new Date("2026-10-29T00:00:00Z"),flags:fullFlags} as any;
}

describe("Bali traditional calendar workspace",()=>{
  it("locks the complete 210-day Pawukon cycle to a golden fingerprint",()=>{
    const cycle=pawukonCycle();
    expect(cycle).toHaveLength(210);
    const golden=cycle.map((p)=>[
      p.day,p.wuku.name,p.dayInWuku,p.saptawara,p.pancawara,p.triwara,p.sadwara,p.caturwara,p.astawara,p.sangawara,p.dasawara,p.dwiwara,p.ekawara||"-",p.urip,
    ].join("|")).join("\n");
    expect(fnv1a(golden)).toBe(0x826577c7);
    expect(cycle[0].wuku.name).toBe("Sinta");
    expect(cycle[209].wuku.name).toBe("Watugunung");
    for(let w=0;w<30;w++)expect(new Set(cycle.slice(w*7,w*7+7).map((p)=>p.wuku.name)).size).toBe(1);
  });

  it("preserves the exceptional repeated Astawara and Sangawara positions",()=>{
    const cycle=pawukonCycle();
    expect(cycle.slice(70,73).map((p)=>p.astawara)).toEqual(["Kala","Kala","Kala"]);
    expect(cycle.slice(70,73).map((p)=>p.caturwara)).toEqual(["Jaya","Jaya","Jaya"]);
    expect(cycle.slice(0,4).map((p)=>p.sangawara)).toEqual(["Dangu","Dangu","Dangu","Dangu"]);
    expect(cycle[4].sangawara).toBe("Jangur");
  });

  it("keeps Ingkel Pandakan and Jejepan on the canonical Pawukon day",()=>{
    const p=pawukon(isoToJdn("1995-10-17"));
    expect(p.saptawara).toBe("Anggara");
    expect(p.pancawara).toBe("Wage");
    expect(p.wuku.name).toBe("Sinta");
    expect(p.ingkel).toBe("Wong");
    expect(p.jejepan).toBe("Sato");
  });

  it("searches traditional Saptawara + Pancawara + Wuku combinations",()=>{
    const hits=rerainanSearch("Buda Kliwon Dungulan","2026-01-01");
    expect(hits).toContainEqual(expect.objectContaining({
      date:"2026-06-17",
      name:"Buda Kliwon Dungulan",
      status:"calculated",
    }));
  });

  it("builds a unique structural 35-cell Palelintangan matrix",()=>{
    const cells=palelintanganMatrix();
    expect(cells).toHaveLength(35);
    expect(new Set(cells.map((x)=>x.key)).size).toBe(35);
    expect(new Set(cells.map((x)=>x.saptawara)).size).toBe(7);
    expect(new Set(cells.map((x)=>x.pancawara)).size).toBe(5);
  });

  it("renders the root as a 30 by 7 Tika rather than a Gregorian-first card",()=>{
    const r:any=baliRoute(ctx(),[]);
    expect((r.html.match(/class="tika-wuku"/g)||[])).toHaveLength(30);
    expect((r.html.match(/class="tika-cell/g)||[])).toHaveLength(210);
    expect(r.html).toContain("30 Wuku × 7 hari");
    expect(r.html).toContain("Pawukon / Tika");
    expect(r.html).toContain("Palelintangan");
    expect(r.html).toContain("Sasih / Saka");
    expect(r.html).toContain('id="tika-overlay-rerainan"');
    expect(r.html).toContain('id="tika-overlay-lunar"');
    expect(r.html).toContain('id="tika-overlay-piodalan"');
    expect(r.html).not.toContain("Jelajahi AafnaiPatro lainnya");
  });

  it("keeps Palelintangan distinct and exactly 35 intersections",()=>{
    const r:any=baliRoute(ctx("/bali-calendar/palelintangan"),["palelintangan"]);
    expect((r.html.match(/class="pal-cell/g)||[])).toHaveLength(35);
    expect(r.html).toContain("7 Saptawara × 5 Pancawara = 35 kombinasi");
    expect(r.html).toContain("tidak diperlakukan sebagai pengganti Tika 210 hari");
  });

  it("shows Ingkel and source-backed Wariga context in the deep day view",()=>{
    const r:any=baliRoute(ctx("/bali-calendar/2026-06-17"),["2026-06-17"]);
    expect(r.html).toContain("Ingkel Pandakan");
    expect(r.html).toContain("Jejepan");
    expect(r.html).toContain("Mertha Yoga");
    expect(r.html).toContain("Pewiwahan · Saptawara");
    expect(r.html).toContain("Buda Kliwon Dungulan");
  });

  it("fails closed for incomplete 2026 Sasih mapping while exposing official anchors",()=>{
    const r:any=baliRoute(ctx("/bali-calendar/sasih-saka"),["sasih-saka"]);
    expect(r.html).toContain("Fail-closed");
    expect(r.html).toContain("Pemetaan Sasih 2026 belum lengkap");
    expect(r.html).toContain("2026-07-29");
    expect(r.html).toContain("2026-09-26");
  });
});
