import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURE_GROUPS, PATRO_FEATURES, getFeatureAvailability, validateFeatureCatalog } from "../src/panchang-jyotish/catalog";
import { FEATURE_ICON_BY_ID, FEATURE_ICON_SYMBOLS } from "../src/panchang-jyotish/FeatureGlyph";
import { FEATURE_REFERENCE_GUIDES } from "../src/panchang-jyotish/feature-reference-guides";

function source(path: string) { return readFileSync(new URL("../" + path, import.meta.url), "utf8"); }

describe("bilingual feature-first visual obligations", () => {
  it("keeps 91 entries and exactly five authored visual categories", () => {
    expect(validateFeatureCatalog().valid).toBe(true);
    expect(FEATURE_GROUPS).toHaveLength(5);
    expect(Object.keys(FEATURE_ICON_BY_ID)).toHaveLength(91);

    const iconSprite = source("public/icons/panchang-jyotish.svg");
    const iconComponent = source("src/panchang-jyotish/FeatureGlyph.tsx");
    const featureIds = PATRO_FEATURES.map(feature => feature.id).sort();
    expect(Object.keys(FEATURE_ICON_BY_ID).sort()).toEqual(featureIds);
    const spriteSymbols = [...iconSprite.matchAll(/<symbol id="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(spriteSymbols).size).toBe(spriteSymbols.length);
    expect(FEATURE_ICON_SYMBOLS.every(symbol => spriteSymbols.includes(symbol))).toBe(true);
    expect(Object.values(FEATURE_ICON_BY_ID).every(symbol => FEATURE_ICON_SYMBOLS.includes(symbol as typeof FEATURE_ICON_SYMBOLS[number]))).toBe(true);
    expect(iconComponent).toContain('href={"/icons/panchang-jyotish.svg#"+icon}');
    expect(iconComponent).not.toContain("https://");
    expect(iconSprite).toContain('<symbol id="search"');
    expect(FEATURE_GROUPS.every(group => FEATURE_ICON_BY_ID[group.iconFeatureId])).toBe(true);
    expect(source("src/panchang-jyotish/FeatureGroupHub.tsx")).toContain('<FeatureGlyph featureId={item.id} size="card"');
    expect(source("src/panchang-jyotish/FeatureExperience.tsx")).toContain('<FeatureGlyph featureId={feature.id} size="hero"');
    const hubSource = source("src/panchang-jyotish/FeatureGroupHub.tsx");
    expect(hubSource).toContain("featureId={group.iconFeatureId} size=\"hero\"");
    expect(hubSource).toContain("featureId={item.iconFeatureId} size=\"card\"");
    expect(hubSource).toContain('symbol="search"');
    expect(hubSource).not.toContain("{group.icon}");
    expect(hubSource).not.toContain("{item.icon}");
    const mainPages = source("src/AafnaiPages.tsx");
    const detailPages = source("src/AafnaiDetailPages.tsx");
    expect(mainPages).toContain('iconFeatureId:"F085"');
    expect(mainPages).toContain('FeatureGlyph featureId="F085" size="inline" className="ap-next-festival-glyph"');
    expect(mainPages).not.toContain('icon:"☾"');
    expect(detailPages).toContain('symbol="sunrise"');
    expect(detailPages).toContain('symbol="sunset"');
    expect(detailPages).toContain('FeatureGlyph featureId="F085" size="inline"');
    expect(source("src/aafnai-enhancements.css")).toContain(".ap-event-card-title .ap-pj-icon");

    const panchang = source("src/panchang-jyotish/workspaces/PanchangWorkspace.tsx");
    expect(panchang).toContain('symbol="sun"');
    expect(panchang).toContain('symbol="moon"');
    expect(panchang).toContain('symbol="nakshatra"');
    expect(panchang).toContain('symbol="yoga"');
    expect(panchang).toContain('symbol="karana"');
    expect(panchang).toContain('symbol="sunrise"');
    expect(panchang).toContain('symbol="sunset"');
    expect(panchang).toContain('className="ap-pjw-icon-label"');
    const daylight = source("src/panchang-jyotish/workspaces/DaylightArc.tsx");
    expect(daylight).toContain('symbol="sunrise"');
    expect(daylight).toContain('symbol="sunset"');
    const ribbon = source("src/panchang-jyotish/workspaces/MuhuratDayRibbon.tsx");
    expect(ribbon).toContain('FeatureGlyph featureId={item.key');
    expect(ribbon).toContain('icon: "sun-star"');
    const muhurat = source("src/panchang-jyotish/workspaces/MuhuratWorkspace.tsx");
    expect(muhurat).toContain('FeatureGlyph featureId={rule.id}');
    expect(muhurat).toContain('symbol="personal-time"');
    const planets = source("src/panchang-jyotish/workspaces/PlanetsWorkspace.tsx");
    expect(planets).toContain("function planetIcon(key:string)");
    expect(planets).toContain("symbol={planetIcon(item.key)}");
    expect(planets).toContain("symbol={planetIcon(item.a.key)}");
    const wheel = source("src/panchang-jyotish/workspaces/PlanetWheel.tsx");
    expect(wheel).toContain("<FeatureGlyph featureId=\"F046\"");
    const jyotish = source("src/panchang-jyotish/workspaces/JyotishWorkspace.tsx");
    expect(jyotish).toContain('symbol="moon"');
    expect(jyotish).toContain('symbol="nakshatra"');
    expect(jyotish).toContain('symbol="ascendant"');
    expect(jyotish).toContain('symbol={planetIcon(planet.key)}');
    const regional = source("src/panchang-jyotish/workspaces/RegionalWorkspace.tsx");
    expect(regional).toContain('FeatureGlyph featureId={item.featureId}');
    expect(regional).toContain('FeatureGlyph featureId={item.id}');
    expect(regional).toContain('symbol="search"');
    expect(regional).toContain('featureId="F090" size="inline"');
    expect(regional).not.toContain("⌕");
    expect(planets).toContain('symbol={planetIcon(item.planet.key)}');
    expect(planets).toContain('symbol={planetIcon(item.a.key)}');
    expect(planets).toContain('symbol={planetIcon(item.b.key)}');
    expect(planets).toContain('symbol={item.degree===0||item.degree===180?"seasons":"sun"}');
    expect(source("src/panchang-jyotish/workspaces/workspace.css")).toContain(".ap-pjw-wheel-key b .ap-pj-icon");
    expect(source("src/panchang-jyotish/workspaces/workspace.css")).toContain(".ap-pjw-icon-label .ap-pj-icon");

    expect(jyotish).toContain('symbol="shield"');
    expect(jyotish).toContain('symbol={planetIcon(planet.key)}');
    expect(jyotish).toContain('symbol="orbit"');
    const glyphSource = source("src/panchang-jyotish/FeatureGlyph.tsx");
    expect(glyphSource).toContain('aria-hidden={decorative}');
    expect(glyphSource).toContain('aria-label={decorative ? undefined : label}');
    expect(glyphSource).toContain("<title>{label}</title>");
    expect(glyphSource).toContain('href={"/icons/panchang-jyotish.svg#"+icon}');
    expect(Object.keys(FEATURE_REFERENCE_GUIDES)).toHaveLength(29);
    for (const item of PATRO_FEATURES.filter(feature => getFeatureAvailability(feature) === "reference")) {
      const guide = FEATURE_REFERENCE_GUIDES[item.id];
      expect(guide).toBeTruthy();
      expect(guide.contextNe.length).toBeGreaterThan(40);
      expect(guide.contextEn.length).toBeGreaterThan(40);
      expect(guide.nextNe.length).toBeGreaterThan(35);
      expect(guide.nextEn.length).toBeGreaterThan(35);
    }
    for (const feature of PATRO_FEATURES) expect(FEATURE_ICON_BY_ID[feature.id]).toBeTruthy();
    const css = source("src/panchang-jyotish/feature-experience.css");
    for (const group of FEATURE_GROUPS) {
      expect(css).toContain(".ap-pj-experience--" + group.id);
      expect(group.titleNe.trim()).not.toBe("");
      expect(group.titleEn.trim()).not.toBe("");
    }
    expect(PATRO_FEATURES.every(feature => feature.titleNe && feature.titleEn && feature.descriptionNe && feature.descriptionEn)).toBe(true);
    expect(PATRO_FEATURES.filter(feature => getFeatureAvailability(feature) === "reference").length).toBeGreaterThan(0);
    expect(getFeatureAvailability(PATRO_FEATURES.find(feature => feature.id === "F021")!)).toBe("browser-preview");
    expect(getFeatureAvailability(PATRO_FEATURES.find(feature => feature.id === "F022")!)).toBe("browser-preview");
  });

  it("uses the homepage language state and does not expose internal identifiers in the spotlight", () => {
    const hub = source("src/panchang-jyotish/FeatureGroupHub.tsx");
    const experience = source("src/panchang-jyotish/FeatureExperience.tsx");
    expect(hub).toContain("useUiLanguage()");
    expect(experience).toContain("l(language,feature.titleNe,feature.titleEn)");
    expect(experience).not.toContain("{feature.id}</span>");
    expect(experience).toContain('symbol="document"');
    expect(experience).toContain('symbol="shield"');
    expect(experience).toContain('<FeatureGlyph featureId={item.id} size="inline" />');
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
    const ribbon = source("src/panchang-jyotish/workspaces/MuhuratDayRibbon.tsx");
    expect(ribbon).toContain("interval.start");
    expect(ribbon).toContain("interval.end");
    const wheel = source("src/panchang-jyotish/workspaces/PlanetWheel.tsx");
    expect(wheel).toContain("item.longitude");
  });

  it("keeps the shared five-hub search, focus and internal related navigation accessible", () => {
    const hub = source("src/panchang-jyotish/FeatureGroupHub.tsx");
    const experience = source("src/panchang-jyotish/FeatureExperience.tsx");
    const style = source("src/panchang-jyotish/feature-group-hub.css");
    const workspace = source("src/panchang-jyotish/workspaces/workspace.css");
    expect(hub).toContain('type="search"');
    expect(hub).toContain('aria-live="polite"');
    expect(hub).toContain("Show all features");
    expect(experience).toContain("event.preventDefault();onNavigate(item)");
    expect(experience).toContain("!event.metaKey");
    expect(style).toContain(":focus-visible");
    expect(style).toContain("prefers-reduced-motion");
    expect(workspace).toContain("overscroll-behavior-x:contain");
  });
  it("keeps archive provenance bilingual and makes long workspace work cancellable", () => {
    const panchang = source("src/panchang-jyotish/workspaces/PanchangWorkspace.tsx");
    expect(panchang).toContain("contract.calendars.nepalSambatEn");
    expect(panchang).toContain("Archive · independent audit pending");
    expect(panchang).toContain("solarArchiveDiffers");
    expect(panchang).toContain("formatDuration(displaySunrise, displaySunset, language)");

    const muhurat = source("src/panchang-jyotish/workspaces/MuhuratWorkspace.tsx");
    expect(muhurat).toContain("setWindowsLoading(true)");
    expect(muhurat).toContain("if(!active)return");
    expect(muhurat).toContain("if((i+1)%2===0)await");
    expect(muhurat).toContain('role="status"');
    expect(muhurat).toContain('role="alert"');

    const jyotish = source("src/panchang-jyotish/workspaces/JyotishWorkspace.tsx");
    expect(jyotish).toContain("setInterval(refresh,60_000)");
    expect(jyotish).toContain('addEventListener("focus",refresh)');
    expect(jyotish).not.toContain("calculateSiderealPlanetPositions(new Date()).find((item)=>item.key===\"saturn\")||null,[]");
  });

  it("exposes Panchak/Ganda Moola only as caveated candidate calculators", () => {
    const catalog = source("src/panchang-jyotish/catalog.ts");
    const experience = source("src/panchang-jyotish/FeatureExperience.tsx");
    const guides = source("src/panchang-jyotish/feature-reference-guides.ts");
    const panchang = source("src/panchang-jyotish/workspaces/PanchangWorkspace.tsx");
    const ruleEngine = source("src/panchang-jyotish/reviewed-candidate-rules.ts");
    expect(catalog).toContain("CANDIDATE_ONLY_SOURCE_REVIEW_PREVIEWS");
    expect(experience).toContain("const guide=FEATURE_REFERENCE_GUIDES[feature.id]");
    expect(guides).toContain("नक्षत्रका प्रवेश र समाप्ति क्षण");
    expect(panchang).toContain("findNakshatraRuleWindows(date, ruleWindowDays, rule");
    expect(panchang).toContain("Candidate Panchak Nakshatra intervals");
    expect(panchang).toContain("is not an official Muhurat");
    expect(panchang).toContain("is not equated with the narrower Gandanta concept");
    expect(ruleEngine).toContain("SIX_HOURS_MS");
    expect(ruleEngine).toContain("candidate-unverified");
  });
});
