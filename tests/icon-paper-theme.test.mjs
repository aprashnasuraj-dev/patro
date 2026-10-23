import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const tools = read("../src/AafnaiPages.tsx");
const details = read("../src/AafnaiDetailPages.tsx");
const launcher = read("../src/components/FeatureLauncher.tsx");
const hub = read("../src/components/FeatureHub.tsx");
const myTime = read("../src/features/my-time/MyTimePage.tsx");
const theme = read("../src/icon-paper-theme.css");
const registry = read("../src/iconography.tsx");
const main = read("../src/main.tsx");

test("tool cards use the shared route icons and semantic paper themes", () => {
  assert.match(tools, /getToolIcon\(item\.href\)/);
  assert.match(tools, /className="ap-tool-icon" data-paper=\{getToolIconTheme\(item\.href\)\}><Icon size=\{24\}/);
  assert.doesNotMatch(tools, /ap-tool-icon">\{item\.icon\}/);
  assert.match(registry, /export function getToolIcon\(href: string\)/);
  assert.match(registry, /export function getToolIconTheme\(href: string\): IconPaperTheme/);
  assert.match(registry, /return "astronomy"/);
  assert.match(registry, /return "astrology"/);
  assert.ok(tools.includes('const Icon=getToolIcon(href);return <a className="ap-tool-card ap-pj-hub-card"'), "specialist Panchang/Jyotish cards must use route icons");
  assert.ok(!tools.includes("FeatureGlyph featureId={item.iconFeatureId}"), "specialist Tools cards must not use the legacy glyph fallback");
  assert.ok(details.includes('className="ap-tool-icon" data-paper="astrology"><FeatureGlyph featureId="F002"'));
  assert.ok(details.includes('className="ap-tool-icon" data-paper="astronomy"><FeatureGlyph featureId="F010"'));
});

test("feature launcher uses SVG icons and a route-specific paper seal", () => {
  assert.match(launcher, /getToolIcon\(href\)/);
  assert.match(launcher, /<Search size=\{19\}/);
  assert.match(launcher, /RouteIcon href=\{item\.href\}/);
  assert.match(launcher, /className="ap-launcher-orb" data-paper=\{getToolIconTheme\(item\.href\)\}/);
  assert.doesNotMatch(launcher, /item\.mark/);
});

test("feature directory uses semantic paper-seal icons", () => {
  assert.match(hub, /className="mp-feature-icon" data-paper=\{getToolIconTheme\(item\.path\)\}/);
  assert.match(hub, /<Icon size=\{25\} strokeWidth=\{2\}/);
});

test("My Time uses family-specific icon textures and preserves Jyotish calculation logic", () => {
  assert.match(myTime, /\[Sunrise,"सूर्योदय र सूर्यास्त"/);
  assert.match(myTime, /\[MoonStar,"ताराबल र चन्द्रबल"/);
  assert.match(myTime, /UPCOMING\.map\(\(\[Icon,titleNe,titleEn,descNe,descEn,status\]\)/);
  assert.match(myTime, /className="mt-layer-icon" data-paper=\{status===/);
  assert.match(myTime, /<Icon size=\{23\}/);
  assert.match(myTime, /personalContext\.birthChart/);
  assert.match(myTime, /scorePersonalizedMuhurta/);
  assert.doesNotMatch(myTime, /\["☼","सूर्योदय/);
});

test("paper icons have visible fibers, double frames and distinct motif families", () => {
  assert.ok(theme.includes("repeating-linear-gradient(33deg, var(--ap-icon-fiber)"));
  assert.ok(theme.includes("radial-gradient(circle at 50% 48%"));
  assert.ok(theme.includes("width: 24px"));
  assert.ok(theme.includes("border: 2px solid var(--ap-icon-edge)"));
  assert.ok(theme.includes("repeating-conic-gradient"));
  for (const family of ["calendar", "astrology", "astronomy", "language", "finance", "measurement", "media", "personal", "create", "utility"]) {
    assert.ok(theme.includes('[data-paper="' + family + '"]'), "missing semantic paper design " + family);
  }
  for (const selector of [".ap-tool-icon", ".ap-launcher-orb", ".mp-feature-icon", ".mt-layer-icon", ".mt-moon-mark", ".mt-insight-icon", ".mt-astro-lucky-orbit"]) {
    assert.ok(theme.includes(selector), "missing lokta-paper icon selector " + selector);
  }
  assert.match(main, /import "\.\/icon-paper-theme\.css";/);
});
