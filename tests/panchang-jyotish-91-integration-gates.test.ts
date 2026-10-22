import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURE_GROUPS, PATRO_FEATURES, getFeatureAvailability, validateFeatureCatalog } from "../src/panchang-jyotish/catalog";
const source=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function parseCsvLine(line:string):string[]{
  const out:string[]=[];let value="";let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'&&quoted&&line[i+1]==='"'){value+='"';i++;}
    else if(ch==='"')quoted=!quoted;
    else if(ch===","&&!quoted){out.push(value);value="";}
    else value+=ch;
  }
  out.push(value);return out;
}
describe("91 feature navigation, runtime and preservation gates",()=>{
  it("reconciles all 91 IDs, original destinations and bilingual copy with the acceptance ledger",()=>{
    const csv=source("docs/panchang-jyotish-integration/05_FEATURE_ACCEPTANCE_91.csv").trim().split(/\r?\n/);
    const headers=parseCsvLine(csv[0]);
    const ledger=csv.slice(1).filter(Boolean).map(line=>Object.fromEntries(headers.map((key,index)=>[key,parseCsvLine(line)[index]])));
    expect(ledger).toHaveLength(91);
    expect(new Set(ledger.map(row=>row.id)).size).toBe(91);
    for(const feature of PATRO_FEATURES){
      const row=ledger.find(item=>item.id===feature.id);
      expect(row,feature.id+" ledger row").toBeDefined();
      expect(row!.canonical_target,feature.id+" original destination").toBe(feature.href);
      expect(row!.title_ne,feature.id+" Nepali copy").toBe(feature.titleNe);
      expect(row!.title_en,feature.id+" English copy").toBe(feature.titleEn);
      const availability=getFeatureAvailability(feature);
      if(availability==="existing") expect(row!.implementation_class).toBe("existing-link");
      else if(availability==="browser-preview") expect(row!.implementation_class).toBe("browser-preview");
      else expect(["reference-not-complete","source-review"]).toContain(row!.implementation_class);
      const expectedStatus=availability==="existing"?"partial":availability==="browser-preview"?"implemented-but-unverified":"blocked";
      expect(row!.release_status).toBe(expectedStatus);
      expect(row!.typecheck).toBe("NOT_RUN");
      expect(row!.regression).toBe("NOT_RUN");
      expect(row!.visual_ne_en).toBe("NOT_RUN");
      expect(row!.pre_pr_gate).toBe("BLOCKED");
    }
  });
  it("propagates the homepage language through all five hubs and their lazy workspaces without a second language selector",()=>{
    const languageHook=source("src/useUiLanguage.ts");
    const home=source("src/HomePageCurrent.tsx");
    const hub=source("src/panchang-jyotish/FeatureGroupHub.tsx");
    expect(home).toContain("useUiLanguage()");
    expect(languageHook).toContain("document.documentElement.lang");
    expect(languageHook).toContain('"patro:language"');
    expect(hub).toContain("const language = useUiLanguage()");
    expect(hub).toContain("<Workspace language={language} selectedFeatureId={activeFeature} />");
    expect(hub).not.toContain("setLanguage");
    for(const name of ["Panchang","Muhurat","Jyotish","Planets","Regional"]){
      const workspace=source("src/panchang-jyotish/workspaces/"+name+"Workspace.tsx");
      expect(workspace, name+" workspace language prop").toMatch(/language\s*:\s*"ne"\s*\|\s*"en"/);
      expect(workspace, name+" localized copy").toContain("l(language,");
      expect(workspace).not.toContain("setLanguage");
      expect(workspace).not.toContain("patro.ui.language");
    }
  });
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
    expect(PATRO_FEATURES.filter(x=>getFeatureAvailability(x)==="browser-preview")).toHaveLength(47);
    expect(PATRO_FEATURES.filter(x=>getFeatureAvailability(x)==="reference")).toHaveLength(27);
    expect(getFeatureAvailability(PATRO_FEATURES.find(x=>x.id==="F021")!)).toBe("browser-preview");
    expect(getFeatureAvailability(PATRO_FEATURES.find(x=>x.id==="F022")!)).toBe("browser-preview");
  });
  it("keeps calculator bundles deferred and restores direct-link selection",()=>{
    const hub=source("src/panchang-jyotish/FeatureGroupHub.tsx");
    for(const name of ["Panchang","Muhurat","Jyotish","Planets","Regional"]) expect(hub).toContain('import("./workspaces/'+name+'Workspace")');
    expect(hub).toContain("const showWorkspace = workspaceRequested");
    expect(hub).toContain("featureFromHash(groupId)");
    expect(hub).toContain('window.addEventListener("hashchange", sync)');
    expect(hub).toContain('window.addEventListener("popstate", sync)');
    expect(hub).toContain("window.history.pushState(null");
    expect(hub).not.toContain("window.history.replaceState(null");
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
