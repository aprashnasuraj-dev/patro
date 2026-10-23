import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const tools = read("../src/AafnaiPages.tsx");
const launcher = read("../src/components/FeatureLauncher.tsx");
const hub = read("../src/components/FeatureHub.tsx");
const myTime = read("../src/features/my-time/MyTimePage.tsx");
const theme = read("../src/icon-paper-theme.css");
const registry = read("../src/iconography.tsx");
const main = read("../src/main.tsx");

test("tool cards use the shared route-to-Lucide icon registry", () => {
  assert.match(tools, /getToolIcon\(item\.href\)/);
  assert.match(tools, /className="ap-tool-icon"><Icon size=\{21\}/);
  assert.doesNotMatch(tools, /ap-tool-icon">\{item\.icon\}/);
  assert.match(registry, /export function getToolIcon\(href: string\)/);
});

test("feature launcher uses SVG search and route icons, not text marks", () => {
  assert.match(launcher, /getToolIcon\(href\)/);
  assert.match(launcher, /<Search size=\{19\}/);
  assert.match(launcher, /RouteIcon href=\{item\.href\}/);
  assert.doesNotMatch(launcher, /item\.mark/);
});

test("feature directory wraps icons in paper-backed semantic containers", () => {
  assert.match(hub, /className="mp-feature-icon"/);
  assert.match(hub, /<Icon size=\{23\} strokeWidth=\{1\.8\}/);
});

test("My Time temporal layers use Lucide icon components and preserve Jyotish hooks", () => {
  assert.match(myTime, /\[Sunrise,"सूर्योदय र सूर्यास्त"/);
  assert.match(myTime, /\[MoonStar,"ताराबल र चन्द्रबल"/);
  assert.match(myTime, /UPCOMING\.map\(\(\[Icon,titleNe,titleEn,descNe,descEn,status\]\)/);
  assert.match(myTime, /<span className="mt-layer-icon"><Icon size=\{21\}/);
  assert.match(myTime, /personalContext\.birthChart/);
  assert.match(myTime, /scorePersonalizedMuhurta/);
  assert.doesNotMatch(myTime, /\["☼","सूर्योदय/);
});

test("CSS-only Nepali paper texture is attached to tools, launcher, features and My Time", () => {
  assert.match(theme, /repeating-linear-gradient/);
  assert.ok(theme.includes("radial-gradient(ellipse at 22% 13%"));
  assert.match(theme, /--ap-icon-tone: #2c6097/);
  assert.match(theme, /--ap-icon-tone: #9b4d36/);
  assert.match(theme, /--ap-icon-wash/);
  assert.ok(theme.includes(".ap-tool-icon::before"));
  assert.ok(theme.includes(".mp-feature-icon::after"));
  for (const selector of [".ap-tool-icon", ".ap-launcher-orb", ".mp-feature-icon", ".mt-layer-icon", ".mt-moon-mark", ".mt-insight-icon", ".mt-astro-lucky-orbit"]) {
    assert.ok(theme.includes(selector), "missing paper icon selector " + selector);
  }
  assert.match(main, /import "\.\/icon-paper-theme\.css";/);
});
