import test from "node:test";
import assert from "node:assert/strict";
import { preetiToUnicode, unicodeToPreeti, convertRuns } from "../public/nepali-tools/core/converter.mjs";
import { romanize, transliterateRoman } from "../public/nepali-tools/core/roman.mjs";
import { SuggestionEngine } from "../public/nepali-tools/core/suggestions.mjs";
import { CURATED_ALIASES } from "../public/nepali-tools/core/aliases.mjs";

test("enhanced Preeti golden conversions", () => {
  assert.equal(preetiToUnicode("g]kfn").text, "नेपाल");
  assert.equal(preetiToUnicode("lzIff").text, "शिक्षा");
  assert.equal(preetiToUnicode("sd{").text, "कर्म");
  assert.equal(preetiToUnicode("lgdf{0f").text, "निर्माण");
});

test("Unicode emits canonical Preeti क्ष rather than Roman alias", () => {
  assert.equal(unicodeToPreeti("क्ष").text, "If");
  assert.equal(unicodeToPreeti("नेपाल").text, "g]kfn");
  assert.equal(unicodeToPreeti("शिक्षा").text, "lzIff");
  assert.ok(!unicodeToPreeti("क्ष").text.includes("kshe"));
});

test("mixed font runs only convert explicit Preeti spans", () => {
  const result = convertRuns([
    { text: "hello ", encoding: "literal" },
    { text: "g]kfn", encoding: "preeti" },
  ], "unicode");
  assert.equal(result.text, "hello नेपाल");
});

test("Roman phonetic fallback keeps basic vowel behavior", () => {
  assert.equal(transliterateRoman("ma"), "म");
  assert.equal(transliterateRoman("maa"), "मा");
  assert.equal(transliterateRoman("namaste"), "नमस्ते");
});

test("curated aliases keep pani and paani distinct before relaxed matching", () => {
  const words = ["पनि", "पानी", "म", "मा", "नमस्ते"];
  const aliasesByWord = new Map();
  for (const [key, word] of Object.entries(CURATED_ALIASES)) {
    const list = aliasesByWord.get(word) || [];
    list.push(key);
    aliasesByWord.set(word, list);
  }
  const rows = words.map((word) => ({
    word,
    keys: [...new Set([romanize(word), ...(aliasesByWord.get(word) || [])].filter(Boolean))],
    priority: aliasesByWord.has(word) ? 100 : 0,
  }));
  const engine = new SuggestionEngine(rows);
  assert.equal(engine.suggest("pani")[0]?.word, "पनि");
  assert.equal(engine.suggest("paani")[0]?.word, "पानी");
  assert.equal(engine.suggest("ma")[0]?.word, "म");
  assert.equal(engine.suggest("maa")[0]?.word, "मा");
});
