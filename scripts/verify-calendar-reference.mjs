import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getDay, tithiText } from "../lib/patro.mjs";

const input = process.argv[2] || process.env.PATRO_REFERENCE_FILE;
if (!input) {
  console.error("Usage: node scripts/verify-calendar-reference.mjs <independent-reference.json>");
  console.error("Reference must contain >=200 independently sourced records across BS 2075-2085 and must not be generated from Aafnai Patro's own archive.");
  process.exit(2);
}

const raw = JSON.parse(await readFile(input, "utf8"));
const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];

function normalize(row) {
  const bs = row?.bs && typeof row.bs === "object"
    ? { year:Number(row.bs.year), month:Number(row.bs.month), day:Number(row.bs.day) }
    : typeof row?.bs === "string"
      ? (() => { const m=row.bs.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); return m?{year:Number(m[1]),month:Number(m[2]),day:Number(m[3])}:null; })()
      : row?.bs_year
        ? { year:Number(row.bs_year), month:Number(row.bs_month), day:Number(row.bs_day) }
        : null;
  const ad = String(row?.ad || row?.ad_date || "").slice(0,10);
  if (!bs || !Number.isInteger(bs.year) || bs.year < 2075 || bs.year > 2085 || !/^\d{4}-\d{2}-\d{2}$/.test(ad)) return null;
  return { bs, ad, tithi:String(row?.tithi || row?.tithi_ne || "").trim(), source:row?.source || raw?.source || null };
}

const candidates = rows.map(normalize).filter(Boolean);
const unique = new Map(candidates.map((row) => [`${row.bs.year}-${row.bs.month}-${row.bs.day}`, row]));
if (unique.size < 200) throw new Error(`Independent reference must contain at least 200 unique BS dates across 2075-2085; found ${unique.size}`);

function rank(row) {
  const key = `${row.bs.year}-${row.bs.month}-${row.bs.day}|aafnai-phase0-2026`;
  return createHash("sha256").update(key).digest("hex");
}
const sample = [...unique.values()].sort((a,b)=>rank(a).localeCompare(rank(b))).slice(0,200);
const representedYears = new Set(sample.map((row)=>row.bs.year));
if (representedYears.size < 8) throw new Error(`200-date sample is too concentrated; expected broad 2075-2085 coverage, found ${representedYears.size} represented BS years`);

const failures = [];
let tithiCompared = 0;
for (const ref of sample) {
  const actual = await getDay(ref.bs.year, ref.bs.month, ref.bs.day);
  const key = `${ref.bs.year}-${String(ref.bs.month).padStart(2,"0")}-${String(ref.bs.day).padStart(2,"0")}`;
  if (!actual) { failures.push(`${key}: missing from Aafnai archive (reference AD ${ref.ad})`); continue; }
  if (actual.ad !== ref.ad) failures.push(`${key}: AD mismatch, Aafnai=${actual.ad}, reference=${ref.ad}`);
  if (ref.tithi) {
    tithiCompared++;
    const actualTithi = tithiText(actual.panchang);
    if (!actualTithi || actualTithi.normalize("NFKC") !== ref.tithi.normalize("NFKC")) failures.push(`${key}: tithi mismatch, Aafnai=${actualTithi || "<missing>"}, reference=${ref.tithi}`);
  }
}

if (failures.length) {
  console.error(`Independent calendar accuracy gate FAILED: ${failures.length} mismatches across 200 dates.`);
  for (const item of failures.slice(0,50)) console.error("- " + item);
  if (failures.length > 50) console.error(`... ${failures.length-50} more`);
  process.exit(1);
}

console.log(`Independent calendar accuracy gate PASSED: 200 BS↔AD dates across ${representedYears.size} BS years (2075-2085 window); ${tithiCompared} optional tithi comparisons.`);
console.log("Reference source metadata:", sample.map((x)=>x.source).filter(Boolean)[0] || "not supplied — retain the reference fixture provenance with the audit record");
