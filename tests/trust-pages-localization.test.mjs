import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/TrustPages.tsx", import.meta.url), "utf8");

test("trust pages subscribe to the shared Nepali/English language state", () => {
  assert.match(source, /useUiLanguage/);
  assert.match(source, /l\(language,/);
  assert.match(source, /\[page, language\]/);
  assert.match(source, /applyLocalizedMetadata\(page, language\)/);
  assert.match(source, /queueMicrotask/);
});

test("all seven trust routes have complete language pairs and unique section anchors", () => {
  const metadata = JSON.parse(readFileSync(new URL("../src/content/platform.json", import.meta.url), "utf8"));
  const content = JSON.parse(readFileSync(new URL("../src/content/trust-pages.json", import.meta.url), "utf8"));
  const routes = ["about", "sources", "privacy", "terms", "contact", "methodology", "corrections"];
  assert.deepEqual(Object.keys(metadata.pages).sort(), routes.sort());
  assert.deepEqual(Object.keys(content).sort(), routes.sort());
  for (const route of routes) {
    const anchors = content[route].map(section => section.id);
    assert.equal(new Set(anchors).size, anchors.length, route + " has duplicate anchors");
    const pairs = [metadata.pages[route].title, metadata.pages[route].description];
    for (const section of content[route]) {
      assert.match(section.id, /^[a-z][a-z-]+$/);
      assert.ok(section.paragraphs.length, route + "/" + section.id + " is empty");
      pairs.push(section.title, ...section.paragraphs, ...(section.links || []).map(link => link.label));
      for (const link of section.links || []) assert.match(link.href, /^(\/|https:\/\/)/);
    }
    for (const pair of pairs) {
      assert.ok(pair.en.trim(), route + " has empty English copy");
      assert.match(pair.ne, /[\u0900-\u097f]/, route + " has missing Nepali copy");
    }
  }
});

test("contact form clearly identifies its email-draft behavior in both languages", () => {
  assert.match(source, /mailto:/);
  assert.match(source, /This form does not submit a message directly to the website/);
  assert.match(source, /यो फारामले वेबसाइटमा सन्देश सिधै पठाउँदैन/);
  assert.match(source, /Prepare email draft/);
  assert.match(source, /इमेल मस्यौदा तयार गर्नुहोस्/);
});

test("external policy links use safe new-tab attributes", () => {
  assert.match(source, /target=\{resource\.external \? "_blank" : undefined\}/);
  assert.match(source, /rel=\{resource\.external \? "noopener noreferrer" : undefined\}/);
});
