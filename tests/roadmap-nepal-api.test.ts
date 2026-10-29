import { describe, expect, it } from "vitest";
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

  it("caps public places results and validates categories", async () => {
    const bad = await nepalApiResponse(new Request("https://aafnaipatro.com/api/nepal/v1/places?category=not-real&limit=999"), env() as any);
    expect(bad?.status).toBe(400);
  });
});
