import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PATRO_FEATURES, FEATURE_GROUPS, getFeatureAvailability, getPublicFeaturesForGroup, PUBLIC_FEATURE_COUNT } from "../src/panchang-jyotish/catalog";
const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
describe("original feature SEO and canonical hub policy",()=>{
  const editorial=JSON.parse(read("seo/panchang-feature-editorial.json")).features as Array<{id:string;group:string;href:string;titleNe:string;titleEn:string;descriptionNe:string;descriptionEn:string}>;
  it("includes only working or existing features in public SEO listings",()=>{
    const publicFeatures=PATRO_FEATURES.filter(feature=>getFeatureAvailability(feature)!=="reference");
    expect(PUBLIC_FEATURE_COUNT).toBe(64);
    expect(getPublicFeaturesForGroup("panchang").every(feature=>getFeatureAvailability(feature)!=="reference")).toBe(true);
    expect(editorial).toHaveLength(64);
    expect(new Set(editorial.map(x=>x.id)).size).toBe(64);
    expect(editorial.map(x=>x.id).sort()).toEqual(publicFeatures.map(x=>x.id).sort());
    for(const feature of PATRO_FEATURES){
      const entry=editorial.find(x=>x.id===feature.id);
      if(getFeatureAvailability(feature)==="reference"){
        expect(entry,feature.id+" must not be published in SEO guides").toBeUndefined();
        continue;
      }
      expect(entry).toBeDefined();
      expect(entry?.href).toBe(feature.href);
      expect(entry?.group).toBe(feature.group);
      expect(entry?.descriptionNe).toBe(feature.descriptionNe);
      expect(entry?.descriptionEn).toBe(feature.descriptionEn);
      expect(entry?.descriptionNe.trim().length).toBeGreaterThan(15);
      expect(entry?.descriptionEn.trim().length).toBeGreaterThan(15);
    }
  });
  it("limits new canonical pages to five hubs and renders every topic in prerender HTML",()=>{
    expect(FEATURE_GROUPS.map(x=>x.href)).toEqual(["/panchang","/muhurat","/jyotish","/planets","/nepal-calendar"]);
    const config=read("scripts/seo-config.mjs");
    for(const group of FEATURE_GROUPS) expect(config).toContain('"'+group.href+'"');
    const prerender=read("scripts/prerender-seo.mjs");
    expect(prerender).toContain("featureDirectory(path)");
    expect(prerender).toContain("esc(item.descriptionNe)");
    expect(prerender).toContain("esc(item.descriptionEn)");
    expect(prerender).toContain("esc(item.href)");
    expect(config).toContain('if (/[?#]/.test(p)) return "query-or-fragment"');
  });
});
