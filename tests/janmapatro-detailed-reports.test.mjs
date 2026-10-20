import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync("src/jyotish/JanmaPatroDetailedReports.tsx", "utf8");
const style = readFileSync("src/jyotish/janmapatro-detailed.css", "utf8");
const suite = readFileSync("src/jyotish/JanmaPatroSuite.tsx", "utf8");

test("birth chart and birth-based Guna Milan expose twelve report pages each", () => {
  assert.match(component, /BIRTH_REPORT_PAGE_COUNT = 12/);
  assert.match(component, /GUNA_REPORT_PAGE_COUNT = 12/);
  assert.equal((component.match(/BIRTH_REPORT_PAGE_TITLES_NE = \[/) || []).length, 1);
  assert.equal((component.match(/GUNA_REPORT_PAGE_TITLES_NE = \[/) || []).length, 1);
  assert.match(component, /data-jpr-report="birth"/);
  assert.match(component, /data-jpr-report="guna-milan"/);
});

test("Nepali reports contain Devanagari terminology for chart and all eight kootas", () => {
  for (const term of ["जन्मपत्रिका", "चन्द्र राशि", "नक्षत्र", "चरण", "लग्न कुण्डली", "विंशोत्तरी महादशा", "मङ्गल दोष", "वर्ण कूट", "वश्य कूट", "तारा कूट", "योनि कूट", "ग्रह मैत्री कूट", "गण कूट", "भकूट कूट", "नाडी कूट"]) {
    assert.ok(component.includes(term), "Missing Nepali term: " + term);
  }
});

test("report CSS provides explicit A4 page boundaries and mobile layouts", () => {
  assert.match(style, /width:200mm/);
  assert.match(style, /min-height:277mm/);
  assert.match(style, /break-after:page/);
  assert.match(style, /@page\{size:A4;margin:0\}/);
  assert.match(style, /max-width:600px/);
});

test("existing export flow captures the report cover for the single-page JPG and retains PDF page breaks", () => {
  assert.match(suite, /DetailedBirthChartReport/);
  assert.match(suite, /DetailedGunaMilanReport/);
    assert.match(suite, /querySelector\("\.jpr-page--cover"\)/);
  assert.match(suite, /pagebreak:\{mode:\["css","legacy"\]\}/);
});
