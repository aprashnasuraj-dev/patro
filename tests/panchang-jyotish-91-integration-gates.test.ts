import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURE_GROUPS, PATRO_FEATURES, getFeatureAvailability, validateFeatureCatalog } from "../src/panchang-jyotish/catalog";
const source=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
describe("91 feature navigation, runtime and preservation gates",()=>{
  it("keeps all features addressable, unique and in their canonical group or existing route",()=>{
    expect(validateFeatureCatalog().valid).toBe(true);
    const hashes=new Set<string>();
    for(const feature of PATRO_FEATURES){
      expect(feature.href.startsWith("/")).toBe(true);
      expect(feature.href).not.toContain("undefined");
      expect(feature.titleNe.trim().length).toBeGreaterThan(0);
      expect(feature.titleEn.trim().length).toBeGreaterThan(0);
      const group=FEATURE_GROUPS.find(x=>x.id===feature.group)!;
      const availability=getFeatureAvailability(feature);
      if(availability!=="existing"){
        expect(feature.href.startsWith(group.href+"#")).toBe(true);
        expect(hashes.has(feature.href)).toBe(false);
        hashes.add(feature.href);
      }
    }
    expect(PATRO_FEATURES.filter(x=>getFeatureAvailability(x)==="existing")).toHaveLength(17);
    expect(PATRO_FEATURES.filter(x=>getFeatureAvailability(x)==="browser-preview")).toHaveLength(45);
    expect(PATRO_FEATURES.filter(x=>getFeatureAvailability(x)==="reference")).toHaveLength(29);
  });
  it("keeps calculator bundles deferred and restores direct-link selection",()=>{
    const hub=source("src/panchang-jyotish/FeatureGroupHub.tsx");
    for(const name of ["Panchang","Muhurat","Jyotish","Planets","Regional"]) expect(hub).toContain('import("./workspaces/'+name+'Workspace")');
    expect(hub).toContain("const showWorkspace = workspaceRequested");
    expect(hub).toContain("featureFromHash(groupId)");
    expect(hub).toContain('window.addEventListener("hashchange", sync)');
    expect(hub).toContain("sync();");
    expect(hub).toContain("event.preventDefault(); openFeature(item)");
    expect(hub).toContain("<WorkspaceErrorBoundary");
    expect(source("src/panchang-jyotish/WorkspaceErrorBoundary.tsx")).toContain("getDerivedStateFromError");
  });
  it("uses the existing archive and JanmaPatro as read-only foundations",()=>{
    const archive=source("src/panchang-jyotish/archive-adapter.ts");
    expect(archive).toContain('archiveDay(dateAd, signal)');
    expect(archive).toContain("mergeVerifiedArchive(calculated, overlay)");
    expect(archive).not.toContain("...nk,");
    const birth=source("src/panchang-jyotish/read-existing-birth.ts");
    expect(birth).not.toContain("localStorage.setItem");
    expect(source("src/panchang-jyotish/workspaces/JyotishWorkspace.tsx")).toContain("readExistingJanmaPatroBirth()");
    expect(source("src/panchang-jyotish/workspaces/PlanetsWorkspace.tsx")).toContain("calculateSiderealPlanetPositions");
  });
});
