import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getYear } from "../lib/patro.mjs";

const root = process.cwd();
const source = process.env.SEO_REFERENCE_FILE || "";
const endpoint = process.env.SEO_REFERENCE_BASE_URL || "";
if (!source && !endpoint) {
  throw new Error("Independent reference required. Set SEO_REFERENCE_FILE to a JSON reference corpus or SEO_REFERENCE_BASE_URL to a trusted comparison endpoint.");
}

function seededShuffle(items, seed = 2083) {
  let s = seed >>> 0;
  const out = [...items];
  const rand = () => { s = (1664525 * s + 1013904223) >>> 0; return s / 0x100000000; };
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const candidates = [];
for (let year = 2075; year <= 2085; year++) candidates.push(...await getYear(year));
if (candidates.length < 200) throw new Error(`Reference audit cannot sample 200 dates; only ${candidates.length} source rows available`);
const sample = seededShuffle(candidates, 20752085).slice(0, 200);

let corpus = null;
if (source) {
  const parsed = JSON.parse(await readFile(resolve(root, source), "utf8"));
  const rows = Array.isArray(parsed) ? parsed : parsed.rows;
  if (!Array.isArray(rows)) throw new Error("SEO_REFERENCE_FILE must contain an array or {rows:[...]}.");
  corpus = new Map(rows.map((row) => [String(row.ad || row.date || row.ad_date).slice(0, 10), row]));
}

function comparable(row) {
  const bs = row?.bs || row?.bikram_sambat || {};
  const p = row?.panchang || {};
  const t = p?.tithi || row?.tithi || {};
  return {
    ad: String(row?.ad || row?.date || row?.ad_date || "").slice(0, 10),
    bs: [Number(bs.year || row?.bs_year), Number(bs.month || row?.bs_month), Number(bs.day || row?.bs_day)],
    tithi: String(typeof t === "string" ? t : t?.ne || t?.name_ne || t?.tithi_name_ne || row?.tithi_name_ne || "").trim()
  };
}

async function referenceFor(row) {
  if (corpus) return corpus.get(row.ad) || null;
  const url = new URL(endpoint);
  url.searchParams.set("ad", row.ad);
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "AafnaiPatro-Accuracy-Audit/1.0" } });
  if (!response.ok) throw new Error(`Reference HTTP ${response.status} for ${row.ad}`);
  return response.json();
}

const failures = [];
let comparedTithi = 0;
for (const row of sample) {
  const externalRaw = await referenceFor(row);
  if (!externalRaw) { failures.push({ ad: row.ad, reason: "missing_reference" }); continue; }
  const local = comparable(row);
  const external = comparable(externalRaw.value || externalRaw.data || externalRaw);
  if (local.bs.join("-") !== external.bs.join("-")) failures.push({ ad: row.ad, reason: "bs_mismatch", local: local.bs, reference: external.bs });
  if (local.tithi && external.tithi) {
    comparedTithi++;
    if (local.tithi !== external.tithi) failures.push({ ad: row.ad, reason: "tithi_mismatch", local: local.tithi, reference: external.tithi });
  }
}

const report = { sample_size: sample.length, bs_year_window: [2075, 2085], compared_tithi: comparedTithi, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) throw new Error(`Independent calendar accuracy audit failed for ${failures.length}/${sample.length} sampled dates`);
console.log(`Independent calendar accuracy audit passed: ${sample.length} dates across BS 2075–2085.`);
