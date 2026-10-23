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

test("all five trust routes provide localized headings and descriptions", () => {
  for (const phrase of [
    "About Aafnai Patro",
    "Sources & methodology",
    "Privacy policy",
    "Terms of use",
    "Contact & support",
    "Our purpose",
    "How to interpret source types",
    "Scope of this policy",
    "Scope of these terms",
    "What can you contact us about?",
    "हाम्रो उद्देश्य",
    "स्रोतको प्रकृति कसरी बुझ्ने",
    "यो नीति केमा लागू हुन्छ",
    "सर्तको दायरा",
    "कस्तो विषयमा सम्पर्क गर्ने?"
  ]) {
    assert.ok(source.includes(phrase), "Missing localized trust-page copy: " + phrase);
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
