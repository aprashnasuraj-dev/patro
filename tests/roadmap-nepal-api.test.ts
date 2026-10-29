import { afterEach, describe, expect, it, vi } from "vitest";
import { nepalApiResponse } from "../worker/nepal-api";

function env(overrides:any = {}) {
  return {
    NEPAL_API_ENABLED: "1",
    NEPAL_CORRECTIONS_ENABLED: "0",
    ASSETS: {
      async fetch(request:Request) {
        const p = new URL(request.url).pathname;
        if (p.endsWith("/manifest.json")) return new Response(JSON.stringify({ dataset_id:"nepalmap-osm-places-v1" }), { status:200 });
        if (/\/index\/[0-9a-f]{2}\.json$/.test(p)) return new Response(JSON.stringify({ n1:["worship",0] }), { status:200 });
        if (p.endsWith("/worship.json")) return new Response(JSON.stringify({
          fields:["name","name_ne","lat","lng","sub","ele","palika_id","ward","district_id","village_slug","wikipedia","source_id"],
          rows:[["Temple","मन्दिर",27.7,85.3,"hindu",0,1,1,1,"","","n1"]]
        }), { status:200 });
        if (p.endsWith("/admin.json")) return new Response(JSON.stringify({ districts:[{id:1,slug:"kathmandu",name:"Kathmandu"}] }), { status:200 });
        return new Response("missing",{status:404});
      }
    },
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("Nepal public API contract", () => {
  it("fails closed when the API runtime gate is off", async () => {
    const r = await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/manifest"), env({NEPAL_API_ENABLED:"0"}) as any);
    expect(r?.status).toBe(503);
    expect(await r?.json()).toMatchObject({error:"nepal_api_disabled"});
  });

  it("serves attributed place detail by source ID through a bucket lookup", async () => {
    const r = await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/place/n1"), env() as any);
    expect(r?.status).toBe(200);
    const body:any = await r?.json();
    expect(body.place.source_id).toBe("n1");
    expect(body.category).toBe("worship");
    expect(body.attribution).toContain("OpenStreetMap");
  });

  it("rejects correction writes from another origin before storage", async () => {
    const r = await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/corrections", {
      method:"POST",
      headers:{"content-type":"application/json","origin":"https://evil.example"},
      body:JSON.stringify({source_id:"n1",reason:"wrong_name",detail:"x"})
    }), env({NEPAL_CORRECTIONS_ENABLED:"1", DB:{}}) as any);
    expect(r?.status).toBe(403);
    expect(await r?.json()).toMatchObject({error:"same_origin_required"});
  });

  it("fails closed when first-party routing is not enabled", async () => {
    const r = await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/route", {
      method:"POST", headers:{"content-type":"application/json","origin":"https://aafnaipatro.com"},
      body:JSON.stringify({mode:"car",points:[{lat:27.7,lng:85.3},{lat:27.8,lng:85.4}]})
    }), env({NEPAL_ROUTING_ENABLED:"0"}) as any);
    expect(r?.status).toBe(503);
    expect(await r?.json()).toMatchObject({error:"routing_disabled"});
  });

  it("relays bounded same-origin route requests to authenticated Valhalla", async () => {
    const upstream = vi.fn(async (url:any, init:any) => {
      expect(url).toBe("https://routing.internal.example/route");
      expect(init.headers.authorization).toBe("Bearer secret-token");
      const body=JSON.parse(init.body);
      expect(body.costing).toBe("pedestrian");
      expect(body.format).toBe("osrm");
      expect(body.shape_format).toBe("geojson");
      expect(body.locations).toEqual([{lat:27.7,lon:85.3,type:"break"},{lat:27.8,lon:85.4,type:"break"}]);
      return new Response(JSON.stringify({routes:[{
        geometry:{type:"LineString",coordinates:[[85.3,27.7],[85.4,27.8]]},
        distance:16000,duration:14400,legs:[]
      }]}),{status:200,headers:{"content-type":"application/json"}});
    });
    vi.stubGlobal("fetch",upstream);
    const r = await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/route", {
      method:"POST",
      headers:{"content-type":"application/json","origin":"https://aafnaipatro.com","sec-fetch-site":"same-origin"},
      body:JSON.stringify({mode:"foot",points:[{lat:27.7,lng:85.3},{lat:27.8,lng:85.4}]})
    }), env({
      NEPAL_ROUTING_ENABLED:"1",
      NEPAL_ROUTING_ORIGIN:"https://routing.internal.example",
      NEPAL_ROUTING_TOKEN:"secret-token"
    }) as any);
    expect(r?.status).toBe(200);
    const body:any=await r?.json();
    expect(body.provider).toBe("aafnaipatro-valhalla");
    expect(body.geometry.type).toBe("LineString");
    expect(body.distance).toBe(16000);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it("rejects route points outside broad Nepal bounds before upstream fetch", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch",upstream);
    const r = await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/route", {
      method:"POST", headers:{"content-type":"application/json","origin":"https://aafnaipatro.com"},
      body:JSON.stringify({mode:"car",points:[{lat:27.7,lng:85.3},{lat:40,lng:85.4}]})
    }), env({
      NEPAL_ROUTING_ENABLED:"1",
      NEPAL_ROUTING_ORIGIN:"https://routing.internal.example",
      NEPAL_ROUTING_TOKEN:"secret-token"
    }) as any);
    expect(r?.status).toBe(400);
    expect(await r?.json()).toMatchObject({error:"point_outside_nepal_bounds"});
    expect(upstream).not.toHaveBeenCalled();
  });

  it("caps public places results and validates categories", async () => {
    const bad = await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/places?category=not-real&limit=999"), env() as any);
    expect(bad?.status).toBe(400);
  });

  it("proxies successful BIPAD responses with bounded cache metadata", async () => {
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({results:[{id:1}]}),{status:200,headers:{"content-type":"application/json"}})));
    const r=await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/emergency?kind=incident&limit=5"),env({NEPAL_EMERGENCY_ENABLED:"1"}) as any);expect(r?.status).toBe(200);expect(r?.headers.get("cache-control")).toContain("max-age=120");const body:any=await r?.json();expect(body.kind).toBe("incident");expect(body.source).toBe("BIPAD Portal");expect(body.fetched_at).toBeTruthy();
  });
  it("returns a bounded timeout error when BIPAD does not answer", async () => {
    vi.useFakeTimers();vi.stubGlobal("fetch",vi.fn((url:any,init:any)=>new Promise((resolve,reject)=>{init.signal.addEventListener("abort",()=>reject(new DOMException("aborted","AbortError")),{once:true});})));
    const promise=nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/emergency?kind=river"),env({NEPAL_EMERGENCY_ENABLED:"1"}) as any);await vi.advanceTimersByTimeAsync(8100);const r=await promise;expect(r?.status).toBe(502);expect(await r?.json()).toMatchObject({error:"bipad_unavailable",kind:"river"});vi.useRealTimers();
  });
});
