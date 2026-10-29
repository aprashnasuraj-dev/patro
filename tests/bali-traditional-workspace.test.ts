import { describe, expect, it } from "vitest";
import { palelintanganMatrix, pawukon, pawukonCycle } from "../worker/worldcal/engines/pawukon";
import { isoToJdn } from "../worker/worldcal/dates";
import { baliRoute, baliUrls, rerainanSearch, wetonRoute } from "../worker/worldcal/pages/bali-weton";
import { sakaYearForDate } from "../worker/worldcal/pages/bali-traditional";
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
    expect(fnv1a(golden)).toBe(0xc058b8ed);
    expect(cycle[0].wuku.name).toBe("Sinta");
    expect(cycle[209].wuku.name).toBe("Watugunung");
    for(let w=0;w<30;w++)expect(new Set(cycle.slice(w*7,w*7+7).map((p)=>p.wuku.name)).size).toBe(1);
  });

  it("matches all 30 independent published Pawukon golden rows including Dasawara",()=>{
    const rows=[
      [1,"-","Menga","Pasah","Sri","Paing","Tungleh","Redite","Sri","Dangu","Sri"],
      [2,"Luang","Pepet","Beteng","Laba","Pon","Aryang","Soma","Indra","Dangu","Pati"],
      [3,"Luang","Pepet","Kajeng","Jaya","Wage","Urukung","Anggara","Guru","Dangu","Raja"],
      [4,"Luang","Pepet","Pasah","Menala","Kliwon","Paniron","Buda","Yama","Dangu","Manuh"],
      [5,"Luang","Pepet","Beteng","Sri","Umanis","Was","Wraspati","Ludra","Jangur","Duka"],
      [6,"Luang","Pepet","Kajeng","Laba","Paing","Maulu","Sukra","Brahma","Gigis","Manuh"],
      [7,"-","Menga","Pasah","Jaya","Pon","Tungleh","Saniscara","Kala","Nohan","Manusa"],
      [8,"Luang","Pepet","Beteng","Menala","Wage","Aryang","Redite","Uma","Ogan","Raksasa"],
      [9,"-","Menga","Kajeng","Sri","Kliwon","Urukung","Soma","Sri","Erangan","Suka"],
      [12,"Luang","Pepet","Kajeng","Menala","Pon","Maulu","Wraspati","Yama","Dadi","Manuh"],
      [17,"-","Menga","Beteng","Sri","Pon","Was","Anggara","Sri","Ogan","Pandita"],
      [25,"-","Menga","Pasah","Sri","Umanis","Tungleh","Buda","Sri","Nohan","Suka"],
      [29,"Luang","Pepet","Beteng","Sri","Kliwon","Was","Redite","Ludra","Tulus","Duka"],
      [33,"-","Menga","Kajeng","Sri","Wage","Urukung","Wraspati","Sri","Gigis","Suka"],
      [36,"-","Menga","Kajeng","Menala","Paing","Maulu","Redite","Yama","Erangan","Sri"],
      [64,"Luang","Pepet","Pasah","Menala","Kliwon","Paniron","Redite","Uma","Urungan","Duka"],
      [65,"Luang","Pepet","Beteng","Sri","Umanis","Was","Soma","Sri","Tulus","Raksasa"],
      [70,"-","Menga","Pasah","Laba","Umanis","Paniron","Saniscara","Brahma","Nohan","Sri"],
      [71,"-","Menga","Beteng","Jaya","Paing","Was","Redite","Kala","Ogan","Sri"],
      [72,"Luang","Pepet","Kajeng","Jaya","Pon","Maulu","Soma","Kala","Erangan","Pati"],
      [73,"Luang","Pepet","Pasah","Jaya","Wage","Tungleh","Anggara","Kala","Urungan","Raja"],
      [74,"Luang","Pepet","Beteng","Menala","Kliwon","Aryang","Buda","Uma","Tulus","Manuh"],
      [75,"Luang","Pepet","Kajeng","Sri","Umanis","Urukung","Wraspati","Sri","Dadi","Duka"],
      [76,"Luang","Pepet","Pasah","Laba","Paing","Paniron","Sukra","Indra","Dangu","Manuh"],
      [77,"-","Menga","Beteng","Jaya","Pon","Was","Saniscara","Guru","Jangur","Manusa"],
      [78,"Luang","Pepet","Kajeng","Menala","Wage","Maulu","Redite","Yama","Gigis","Raksasa"],
      [185,"-","Menga","Beteng","Jaya","Umanis","Was","Anggara","Kala","Jangur","Dewa"],
      [204,"Luang","Pepet","Kajeng","Laba","Kliwon","Maulu","Redite","Indra","Gigis","Duka"],
      [209,"-","Menga","Beteng","Jaya","Kliwon","Was","Sukra","Kala","Tulus","Sri"],
      [210,"-","Menga","Kajeng","Menala","Umanis","Maulu","Saniscara","Uma","Dadi","Sri"],
    ] as const;
    for(const [n,eka,dwi,tri,catur,panca,sad,sapta,asta,sanga,dasa] of rows){
      const p=pawukonCycle()[n-1];
      expect([p.ekawara||"-",p.dwiwara,p.triwara,p.caturwara,p.pancawara,p.sadwara,p.saptawara,p.astawara,p.sangawara,p.dasawara],String(n))
        .toEqual([eka,dwi,tri,catur,panca,sad,sapta,asta,sanga,dasa]);
    }
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

  it("uses Nyepi as the Saka-year boundary shown in the printed-style masthead",()=>{
    expect(sakaYearForDate("2026-03-18")).toBe(1947);
    expect(sakaYearForDate("2026-03-19")).toBe(1948);
    expect(sakaYearForDate("2026-10-29")).toBe(1948);
    const r:any=baliRoute(ctx(),[]);
    expect(r.html).toContain("ÇAKA 1948");
  });

  it("supports dynamic Bali pages from 1929 through 2129 without pretending annual lunar data exists",()=>{
    expect((baliRoute(ctx("/bali-calendar/1929-01-01"),["1929-01-01"]) as any)?.status).toBe(200);
    const far:any=baliRoute(ctx("/bali-calendar/2129-12-31"),["2129-12-31"]);
    expect(far?.status).toBe(200);
    expect(far?.html).toContain("Fase Bulan");
    expect(far?.html).toContain("Penetapan Purnama, Tilem, Sasih");
    expect(far?.html).toContain("/bali-calendar/sasih-saka?tanggal=2129-12-31");
    const sasihCtx:any=ctx("/bali-calendar/sasih-saka?tanggal=2129-12-31");sasihCtx.url=new URL("https://aafnaipatro.com/bali-calendar/sasih-saka?tanggal=2129-12-31");
    const sasih:any=baliRoute(sasihCtx,["sasih-saka"]);
    expect(sasih?.html).toContain("Kalender Sasih lengkap 2129 belum tersedia");
    expect(sasih?.html).toContain("Fase Bulan");
    expect(baliRoute(ctx("/bali-calendar/1928-12-31"),["1928-12-31"])).toBeNull();
    expect(baliRoute(ctx("/bali-calendar/2130-01-01"),["2130-01-01"])).toBeNull();
    expect((wetonRoute(ctx("/weton/1900-01-01"),["1900-01-01"]) as any)?.status).toBe(200);
    expect(wetonRoute(ctx("/weton/1899-12-31"),["1899-12-31"])).toBeNull();
    const jump1929:any=ctx("/bali-calendar/go?tanggal=1929-01-01");jump1929.url=new URL("https://aafnaipatro.com/bali-calendar/go?tanggal=1929-01-01");
    expect((baliRoute(jump1929,["go"]) as any)?.location).toBe("/bali-calendar/1929-01-01");
    const jump2129:any=ctx("/bali-calendar/go?tanggal=2129-12-31");jump2129.url=new URL("https://aafnaipatro.com/bali-calendar/go?tanggal=2129-12-31");
    expect((baliRoute(jump2129,["go"]) as any)?.location).toBe("/bali-calendar/2129-12-31");
    const jumpBad:any=ctx("/bali-calendar/go?tanggal=2130-01-01");jumpBad.url=new URL("https://aafnaipatro.com/bali-calendar/go?tanggal=2130-01-01");
    expect((baliRoute(jumpBad,["go"]) as any)?.location).toBe("/bali-calendar");
  });

  it("builds a unique structural 35-cell Palelintangan matrix",()=>{
    const cells=palelintanganMatrix();
    expect(cells).toHaveLength(35);
    expect(new Set(cells.map((x)=>x.key)).size).toBe(35);
    expect(new Set(cells.map((x)=>x.saptawara)).size).toBe(7);
    expect(new Set(cells.map((x)=>x.pancawara)).size).toBe(5);
    expect(new Set(cells.map((x)=>x.lintang)).size).toBe(35);
    expect(cells.find((x)=>x.saptawara==="Redite"&&x.pancawara==="Umanis")?.lintang).toBe("Kala Sungsang");
    expect(cells.find((x)=>x.saptawara==="Saniscara"&&x.pancawara==="Kliwon")?.lintang).toBe("Larung Paglangan");
    expect(cells.find((x)=>x.saptawara==="Buda"&&x.pancawara==="Pon")?.patron).toBe("Bhatara Wisnu");
    expect(cells.every((x)=>Boolean(x.lintangAksara))).toBe(true);
    expect(cells.find((x)=>x.saptawara==="Redite"&&x.pancawara==="Umanis")?.lintangAksara).toBe("ᬓᬮᬲᬸᬗ᭄ᬲᬂ");
  });

  it("renders a print-inspired monthly Tika with Wuku columns, Saptawara rows and Ingkel",()=>{
    const r:any=baliRoute(ctx(),[]);
    expect(r.html).toContain('class="bali-workspace bali-traditional-workspace"');
    const monthCells=(r.html.match(/class="tika-month-cell/g)||[]).length;
    expect(monthCells).toBeGreaterThanOrEqual(35);
    expect(monthCells).toBeLessThanOrEqual(42);
    expect((r.html.match(/class="tika-weekday"/g)||[])).toHaveLength(7);
    expect((r.html.match(/class="tika-ingkel"/g)||[]).length).toBeGreaterThanOrEqual(5);
    expect((r.html.match(/class="full-wuku(?: current)?"/g)||[])).toHaveLength(30);
    expect(r.html).toContain("Kalender Wuku dan Wewaran bulan ini");
    expect(r.html).toContain("INGKEL");
    expect(r.html).toContain("Pawukon / Tika");
    expect(r.html).toContain("Palelintangan");
    expect(r.html).toContain("Sasih / Saka");
    expect(r.html).toContain('class="dewasa-grid"');
    expect(r.html).toContain("Pewiwahan");
    expect(r.html).toContain("Mertha Yoga");
    expect(r.html).toContain("Memahami Pawukon, Wuku, Wewaran dan hari raya Bali");
    expect(r.html).toContain("Tentang perhitungan dan data kalender");
    expect(r.html).not.toContain("Dasar tampilan");
    expect(r.html).not.toContain("fail-closed");
    expect(r.html).toContain("ᬭᬤᬶᬢᬾ");
    expect(r.html).toContain("ᬰᬦᬶᬰ᭄ᬘᬭ");
    expect(r.html).toContain('id="my-bali"');
    expect(r.html).toContain('action="/bali-calendar/go"');
    expect(r.html).toContain('min="1929-01-01"');
    expect(r.html).toContain('max="2129-12-31"');
    expect(r.html).toContain("data-bali-recent=");
    expect(r.html).toContain("My Pura");
    expect(r.html).toContain('id="bali-pura-form"');
    expect(r.html).toContain("Piodalan yang mengikuti Sasih");
    expect(r.html).toContain("7 hari");
    expect(r.html).toContain("35 hari");
    expect(r.html).toContain("210 hari");
    expect(r.html).not.toContain("Jelajahi AafnaiPatro lainnya");
  });

  it("keeps Palelintangan distinct, rich and discoverable as one evergreen page",()=>{
    const r:any=baliRoute(ctx("/bali-calendar/palelintangan"),["palelintangan"]);
    expect(r.indexable).toBe(true);
    expect(baliUrls(new Date("2026-10-29T00:00:00Z"),fullFlags)).toContain("/bali-calendar/palelintangan");
    expect((r.html.match(/<article class="pal-cell(?: is-current)?"/g)||[])).toHaveLength(35);
    expect(r.html).toContain('class="pal-hero"');
    expect(r.html).toContain('class="pal-lintang-aksara"');
    expect(r.html).toContain("Cara membaca Palelintangan Bali");
    expect(r.html).toContain("Bagan Palelintangan");
    expect(r.html).toContain("Tentang nama 35 Lintang");
    expect(r.html).not.toContain("Alfred Maaß");
    expect(r.html).toContain("Kala Sungsang");
    expect(r.html).toContain("Bhatara Wisnu");
    expect(r.html).toContain("ᬓᬮᬲᬸᬗ᭄ᬲᬂ");
  });

  it("shows Ingkel and Wariga context in the deep day view",()=>{
    const r:any=baliRoute(ctx("/bali-calendar/2026-06-17"),["2026-06-17"]);
    expect(r.html).toContain("Ingkel Pandakan");
    expect(r.html).toContain("Jejepan");
    expect(r.html).toContain("Mertha Yoga");
    expect(r.html).toContain("Pewiwahan");
    expect(r.html).toContain("Buda Kliwon Dungulan");
  });

  it("keeps incomplete 2026 Sasih dates conservative while showing available anchors",()=>{
    const r:any=baliRoute(ctx("/bali-calendar/sasih-saka"),["sasih-saka"]);
    expect(r.html).toContain("Kalender Sasih lengkap 2026 belum tersedia");
    expect(r.html).toContain("AafnaiPatro hanya menampilkan tanggal Sasih");
    expect(r.html).not.toContain("Fail-closed");
    expect(r.html).not.toContain("mapping_complete");
    expect(r.html).toContain("2026-07-29");
    expect(r.html).toContain("2026-09-26");
  });
});
