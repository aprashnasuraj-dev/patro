import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PATRO_FEATURES, FEATURE_GROUPS, getFeaturesForGroup } from "../src/panchang-jyotish/catalog";
const read=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
describe("original feature SEO and canonical hub policy",()=>{
  const editorial=JSON.parse(read("seo/panchang-feature-editorial.json")).features as Array<{id:string;group:string;href:string;titleNe:string;titleEn:string;descriptionNe:string;descriptionEn:string}>;
  it("covers every feature with original bilingual short copy and no orphan",()=>{
    expect(editorial).toHaveLength(91);
    expect(new Set(editorial.map(x=>x.id)).size).toBe(91);
    for(const feature of PATRO_FEATURES){
      const entry=editorial.find(x=>x.id===feature.id);
      expect(entry).toBeDefined();
      expect(entry?.href).toBe(feature.href);
      expect(entry?.group).toBe(feature.group);
      expect(entry?.descriptionNe).toBe(feature.descriptionNe);
      expect(entry?.descriptionEn).toBe(feature.descriptionEn);
      expect(entry?.descriptionNe.trim().length).toBeGreaterThan(15);
      expect(entry?.descriptionEn.trim().length).toBeGreaterThan(15);
    }
  });
  it("limits prerender directories to public features without deleting the 91-row inventory",()=>{
    expect(FEATURE_GROUPS.map(x=>x.href)).toEqual(["/panchang","/muhurat","/jyotish","/planets","/nepal-calendar"]);
    const config=read("scripts/seo-config.mjs");
    for(const group of FEATURE_GROUPS) expect(config).toContain('"'+group.href+'"');
    const prerender=read("scripts/prerender-seo.mjs");
    expect(prerender).toContain("featureDirectory(path)");
    expect(prerender).toContain("PUBLIC_FEATURE_IDS.has(item.id)");
    expect(prerender).toContain('row.implementation_class === "existing-link"');
    expect(prerender).toContain('row.implementation_class === "browser-preview"');
    expect(prerender).toContain("Expected 65 functioning public features");
    expect(prerender).toContain("esc(item.descriptionNe)");
    expect(prerender).toContain("esc(item.descriptionEn)");
    expect(prerender).toContain("esc(item.href)");
    const publicFeatures=FEATURE_GROUPS.flatMap(group=>getFeaturesForGroup(group.id));
    expect(publicFeatures).toHaveLength(65);
    expect(publicFeatures.some(feature=>feature.id==="F029")).toBe(false);
    expect(publicFeatures.some(feature=>feature.id==="F060")).toBe(false);
    expect(publicFeatures.some(feature=>feature.id==="F082")).toBe(false);
    expect(editorial).toHaveLength(91);
    expect(config).toContain('if (/[?#]/.test(p)) return "query-or-fragment"');
  });
});
