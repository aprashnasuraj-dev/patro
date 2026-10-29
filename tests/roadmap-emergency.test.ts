import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as any).AafnaiEmergency;
});

function fakeMap() {
  const sources:any = {};
  return {
    sources,
    getSource(id:string){ return sources[id] || null; },
    addSource(id:string, def:any){
      sources[id] = { data:def.data, setData(data:any){ this.data=data; } };
    },
    addLayer(){},
    on(){},
    setLayoutProperty(){},
    querySourceFeatures(id:string){ return sources[id]?.data?.features || []; },
  };
}

async function api() {
  await import("../scripts/explore/nepal/map/emergency.js?test=" + Math.random());
  return (globalThis as any).AafnaiEmergency;
}

describe("Nepal resilience/BIPAD degradation reporting", () => {
  it("reports partial feed failure without discarding successful BIPAD features", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url:any) => {
      const u=String(url);
      if(u.includes("kind=alert")) return new Response("down",{status:502});
      const kind=new URL(u,"https://aafnaipatro.com").searchParams.get("kind");
      return new Response(JSON.stringify({
        fetched_at:"2026-10-29T00:00:00Z",
        source_url:"https://bipadportal.gov.np/api/v1/"+kind+"/",
        data:[{name:String(kind),longitude:85.3,latitude:27.7}]
      }),{status:200,headers:{"content-type":"application/json"}});
    }));
    const map:any=fakeMap(), A=await api();
    const result=await A.setVisible(map,true);
    expect(result).toMatchObject({features:6,total_feeds:7,successful:6,failed:1,degraded:true,complete:false});
    expect(result.failed_kinds).toEqual(["alert"]);
    expect(map.sources["np-emergency"].data.features).toHaveLength(6);
    const cached=await A.setVisible(map,true);
    expect(cached.failed).toBe(1);
  });

  it("makes total upstream failure explicit while keeping the module operational", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down",{status:502})));
    const map:any=fakeMap(), A=await api();
    const result=await A.setVisible(map,true);
    expect(result).toMatchObject({features:0,total_feeds:7,successful:0,failed:7,degraded:true,complete:false});
    expect(result.failed_kinds).toHaveLength(7);
  });
});
