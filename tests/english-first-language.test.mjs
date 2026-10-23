import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const appChrome = read("src/components/AppChrome.tsx");
const homepage = read("src/components/HomepageEnhancer.tsx");
const launcher = read("src/components/FeatureLauncher.tsx");
const languageHook = read("src/useUiLanguage.ts");
const index = read("index.html");
const prerender = read("scripts/prerender-seo.mjs");
const intents = JSON.parse(read("seo/search-intents.json"));

test("first visit defaults to English outside Nepali browser locales and preserves manual choice", () => {
  assert.ok(appChrome.includes('localStorage.getItem("patro.ui.language")'));
  assert.ok(appChrome.includes("navigator.languages?.[0] || navigator.language"));
  assert.ok(appChrome.includes('return /^ne(?:-|$)/i.test(locale) ? "ne" : "en";'));
  assert.ok(languageHook.includes('if (saved === "ne" || saved === "en") return saved'));
  assert.ok(languageHook.includes('return "en";'));
  assert.ok(index.includes('<html lang="en">'));
});

test("homepage-injected links and featured navigation follow the active language", () => {
  assert.ok(homepage.includes("const language = useUiLanguage()"));
  for (const phrase of [
    'l(language, "ज्योतिष", "Jyotish")',
    'l(language, "समययन्त्र", "Time Machine")',
    'l(language, "खगोलीय पात्रो", "Astronomical calendar")',
    'l(language, "सबै उपकरण", "All tools")'
  ]) assert.ok(homepage.includes(phrase), "Missing bilingual homepage label: " + phrase);
  assert.ok(appChrome.includes("ne?titleNe:titleEn"));
  assert.ok(appChrome.includes("ne?descNe:descEn"));
  assert.ok(appChrome.includes("Advanced tools"));
});

test("feature search puts selected-language text first, including category labels and empty states", () => {
  assert.ok(launcher.includes("const language = useUiLanguage()"));
  assert.ok(launcher.includes("<strong>{ne?item.ne:item.en}</strong>"));
  assert.ok(launcher.includes('ne?item.group.split(" · ")[0]'));
  assert.ok(launcher.includes("Search all features"));
  assert.ok(launcher.includes("No matching feature found"));
  assert.ok(launcher.includes("All tools"));
});

test("static HTML and crawler-facing metadata are English-first", () => {
  assert.ok(index.includes("<title>Nepali Calendar Today"));
  assert.ok(index.includes('name="description" content="Nepali calendar for today in Nepal'));
  assert.ok(index.includes('property="og:locale" content="en_US"'));
  assert.ok(index.includes('hreflang="en"'));
  assert.ok(prerender.includes("'<html lang=\"en\"'"));
  assert.ok(prerender.includes("Nepal Time Machine | History Timeline"));
  assert.ok(prerender.includes("Vedic Birth Chart & Nepali Jyotish"));
  assert.ok(prerender.includes("Explore these tools · यस समूहका विषय र उपकरण"));
  assert.ok(prerender.includes("item.titleEn"));
  assert.ok(prerender.includes("item.titleNe"));
  assert.equal(intents.core["/"].title, "Nepali Calendar Today | Nepal Date, Tithi & Festivals");
  assert.equal(intents.core["/tools"].title, "Free Online Tools for Nepal | Aafnai Patro");
  assert.equal(intents.tools["/tools/astro"].title, "Nepali Astronomical Calendar | Tithi, Moon Phase & Sky Events");
});
