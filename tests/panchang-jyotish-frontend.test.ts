import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURE_GROUPS, PATRO_FEATURES, getFeatureAvailability, validateFeatureCatalog } from "../src/panchang-jyotish/catalog";
import { FEATURE_SYMBOL } from "../src/panchang-jyotish/FeatureExperience";

function source(path: string) { return readFileSync(new URL("../" + path, import.meta.url), "utf8"); }

describe("bilingual feature-first visual obligations", () => {
  it("keeps 91 entries and exactly five authored visual categories", () => {
    expect(validateFeatureCatalog().valid).toBe(true);
    expect(FEATURE_GROUPS).toHaveLength(5);
    expect(Object.keys(FEATURE_SYMBOL)).toHaveLength(91);
    for (const feature of PATRO_FEATURES) expect(FEATURE_SYMBOL[feature.id]).toBeTruthy();
    const css = source("src/panchang-jyotish/feature-experience.css");
    for (const group of FEATURE_GROUPS) {
      expect(css).toContain(".ap-pj-experience--" + group.id);
      expect(group.titleNe.trim()).not.toBe("");
      expect(group.titleEn.trim()).not.toBe("");
    }
    expect(PATRO_FEATURES.every(feature => feature.titleNe && feature.titleEn && feature.descriptionNe && feature.descriptionEn)).toBe(true);
    expect(PATRO_FEATURES.filter(feature => getFeatureAvailability(feature) === "reference").length).toBeGreaterThan(0);
  });

  it("uses the homepage language state and does not expose internal identifiers in the spotlight", () => {
    const hub = source("src/panchang-jyotish/FeatureGroupHub.tsx");
    const experience = source("src/panchang-jyotish/FeatureExperience.tsx");
    expect(hub).toContain("useUiLanguage()");
    expect(experience).toContain("l(language,feature.titleNe,feature.titleEn)");
    expect(experience).not.toContain("{feature.id}</span>");
    expect(hub).not.toMatch(/setLanguage\(|localStorage\.setItem\(/);
  });

  it("defers calculator mounting, offers a real action, and preserves source review", () => {
    const hub = source("src/panchang-jyotish/FeatureGroupHub.tsx");
    expect(hub).toContain("const showWorkspace = workspaceRequested");
    expect(hub).toContain("setWorkspaceRequested(true)");
    expect(hub).toContain("selectedAvailability === \"reference\"");
    expect(hub).toContain("availabilityFilter");
    const experience = source("src/panchang-jyotish/FeatureExperience.tsx");
    expect(experience).toContain('state==="reference"');
    expect(experience).toContain('href="/sources"');
    expect(experience).toContain('state==="existing"');
    expect(experience).toContain('href={feature.href}');
  });

  it("does not request remote images or silently add a second profile to the presentation", () => {
    const files = [
      "src/panchang-jyotish/FeatureExperience.tsx",
      "src/panchang-jyotish/feature-experience.css",
      "src/panchang-jyotish/workspaces/DaylightArc.tsx"
    ];
    for (const file of files) {
      const content = source(file);
      expect(content).not.toMatch(/https?:\/\//);
      expect(content).not.toMatch(/localStorage\.setItem\(|\bfetch\s*\(/);
    }
    const arc = source("src/panchang-jyotish/workspaces/DaylightArc.tsx");
    expect(arc).toContain("day.sunrise");
    expect(arc).toContain("day.sunset");
  });
});
