import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURE_GROUPS, PATRO_FEATURES } from "../src/panchang-jyotish/catalog";
import { CORE_INDEX_ROUTES, TOOL_ROUTES } from "../scripts/seo-config.mjs";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const GROUP_PATHS = ["/panchang", "/muhurat", "/jyotish", "/planets", "/nepal-calendar"];

describe("five-group release preservation contracts", () => {
  it("all group pages belong to the existing canonical core sitemap, not a competing inventory", () => {
    expect(FEATURE_GROUPS.map((group) => group.href)).toEqual(GROUP_PATHS);
    GROUP_PATHS.forEach((route) => expect(CORE_INDEX_ROUTES).toContain(route));
    expect(TOOL_ROUTES).toHaveLength(29);
    expect(new Set([...CORE_INDEX_ROUTES, ...TOOL_ROUTES]).size).toBe(CORE_INDEX_ROUTES.length + TOOL_ROUTES.length);
    PATRO_FEATURES.forEach((feature) => {
      const url = feature.href.split("#")[0];
      expect(url.startsWith("/")).toBe(true);
      expect(!url.startsWith("/api/")).toBe(true);
      expect(!url.startsWith("/me/")).toBe(true);
    });
  });
  it("keeps workspaces lazy and does not add a language selector or API-only calculation", () => {
    const hub = read("src/panchang-jyotish/FeatureGroupHub.tsx");
    expect(hub).toContain("useUiLanguage");
    expect(hub).toContain("lazy(() => import(");
    expect(hub).not.toMatch(/setLanguage|patro\.ui\.language|localStorage/);
    for (const name of ["Panchang", "Muhurat", "Jyotish", "Planets", "Regional"]) {
      const workspace = read("src/panchang-jyotish/workspaces/" + name + "Workspace.tsx");
      expect(workspace).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|wrangler|env\.DB/);
      expect(workspace).not.toMatch(/setLanguage|patro\.ui\.language/);
    }
  });
  it("does not duplicate or edit My Time and keeps original profile bridge as read-only", () => {
    const jyotish = read("src/panchang-jyotish/workspaces/JyotishWorkspace.tsx");
    expect(jyotish).toContain("readExistingJanmaPatroBirth");
    const bridge = read("src/panchang-jyotish/read-existing-birth.ts");
    expect(bridge).toContain("readJanmaPatroBirthInput");
    expect(bridge).toContain("JANMAPATRO_CONTEXT_STORAGE_KEY");
    expect(bridge).not.toContain("setItem(");
    expect(jyotish).not.toContain("saveJanmaPatroContext");
    expect(jyotish).not.toContain("JANMAPATRO_CONTEXT_STORAGE_KEY");
    const hub = read("src/panchang-jyotish/catalog.ts");
    expect(hub).toContain('"/mytime", "reuse"');
  });
  it("guards all My Time source and test paths in the read-only pre-PR audit", () => {
    const audit = read("scripts/panchang-prepr-audit.mjs");
    expect(audit).toContain("tests\\/my-time-");
    expect(audit).toContain("src\\/features\\/my-time\\/");
    expect(audit).toContain('BASE + "...HEAD"');
    expect(audit).not.toMatch(/wrangler\\s+(?:deploy|publish)|cloudflare\\s+deploy/);
  });
  it("does not introduce a production deployment command or a new database binding", () => {
    const paths = ["src/panchang-jyotish/catalog.ts", "src/panchang-jyotish/contract.ts", "src/panchang-jyotish/FeatureGroupHub.tsx"];
    for (const path of paths) {
      const content = read(path);
      expect(content).not.toMatch(/wrangler\s+(?:deploy|d1|r2|kv)|CLOUDFLARE_API_TOKEN|\bDB\.prepare\s*\(/i);
    }
  });
});
