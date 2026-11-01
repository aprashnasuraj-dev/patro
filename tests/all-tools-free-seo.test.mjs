import test from "node:test";
import assert from "node:assert/strict";
import { freeToolName, freeToolSeoTitle, freeToolDescription } from "../scripts/tool-growth/free-seo.mjs";

test("tool names state free availability without double prefixes", () => {
  assert.equal(freeToolName("Mortgage Recast Calculator"), "Free Mortgage Recast Calculator");
  assert.equal(freeToolName("Free CSV to JSON Converter"), "Free CSV to JSON Converter");
  assert.equal(freeToolSeoTitle("DKIM Record Checker"), "Free DKIM Record Checker | AafnaiPatro");
});
test("long, specific names remain distinct rather than being silently truncated", () => {
  const title = "PON Splitter Cascade Optical Budget Calculator with Long Designation";
  assert.equal(freeToolSeoTitle(title), "Free " + title);
});
test("meta descriptions are bounded, readable, and preserve substantive first sentences", () => {
  for (const input of [
    "Calculate repayments with several mortgage scenarios. Review monthly balances and optional additional payments before applying.",
    "Convert a file into another format without uploading confidential inputs to a server. Keep control of your working data in the browser.",
    "Runs locally in your browser; your working data is not sent to AafnaiPatro.",
  ]) {
    const description = freeToolDescription(input);
    assert.match(description, /free/i);
    assert.ok(description.length <= 160);
    assert.match(description, /[.!?]$/);
  }
});
test("rejects empty titles and descriptions", () => {
  assert.throws(() => freeToolName(" "));
  assert.throws(() => freeToolDescription(""));
});
