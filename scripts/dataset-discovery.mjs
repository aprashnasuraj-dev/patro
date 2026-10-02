import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getAllDays, getDatasetInventory, getDay, getDayByAd, getMonth, getYear,
  getFestivals, getFestival, getSait, getHolidays, convertBsToAd, convertAdToBs,
  getTodayNepal, getTithiAt
} from "../lib/patro.mjs";

const root = process.cwd();
const inventory = await getDatasetInventory();
const rows = await getAllDays();
if (!rows.length) throw new Error("Phase 0 failed: calendar dataset is empty");
if (inventory.calendarRows < 70000) throw new Error(`Phase 0 failed: expected full archive, found ${inventory.calendarRows} calendar rows`);
if (!inventory.firstAd || !inventory.lastAd || !inventory.firstBs || !inventory.lastBs) throw new Error("Phase 0 failed: range metadata missing");

const midpoint = rows[Math.floor(rows.length / 2)];
const roundTripAd = await convertBsToAd(midpoint.bs);
const roundTripBs = await convertAdToBs(midpoint.ad);
if (roundTripAd !== midpoint.ad) throw new Error("Phase 0 failed: BS→AD round-trip mismatch");
if (!roundTripBs || Number(roundTripBs.year) !== Number(midpoint.bs.year) || Number(roundTripBs.month) !== Number(midpoint.bs.month) || Number(roundTripBs.day) !== Number(midpoint.bs.day)) {
  throw new Error("Phase 0 failed: AD→BS round-trip mismatch");
}

const requiredFunctions = {
  getDay, getDayByAd, getMonth, getYear, getFestivals, getFestival, getSait, getHolidays,
  convertBsToAd, convertAdToBs, getTodayNepal, getTithiAt
};
for (const [name, fn] of Object.entries(requiredFunctions)) if (typeof fn !== "function") throw new Error(`Phase 0 failed: adapter function missing: ${name}`);

const report = {
  generated_at: new Date().toISOString(),
  source: "migration/data/public/astronomy_calendar_map + approved public reference snapshots",
  dataset_policy: "No second calendar dataset. Build-time and runtime adapters wrap the same approved source model.",
  calendar: {
    rows: inventory.calendarRows,
    ad_range: [inventory.firstAd, inventory.lastAd],
    bs_range: [inventory.firstBs, inventory.lastBs],
    fields: inventory.fields?.calendar || [],
    bs_fields: inventory.fields?.bs || [],
    panchang_fields: inventory.fields?.panchang || []
  },
  holidays: { rows: inventory.holidayRows, fields: inventory.fields?.holiday || [] },
  panchang_facts: { rows: inventory.panchangFactRows, fields: inventory.fields?.panchangFact || [] },
  cities: inventory.cities,
  converter: {
    server_exposed: true,
    adapter_functions: ["convertBsToAd", "convertAdToBs"],
    sampled_round_trip: { ad: midpoint.ad, bs: midpoint.bs, passed: true }
  },
  exact_adapter_contract: Object.keys(requiredFunctions),
  provenance_note: "Per-record source/verification fields are preserved when present; missing provenance must not be fabricated in rendered output.",
  independent_accuracy_audit: {
    required_sample_size: 200,
    bs_year_window: [2075, 2085],
    command: "npm run seo:accuracy-reference",
    note: "Independent-reference comparison is intentionally separate from the normal build because it requires an external reference snapshot or endpoint."
  }
};

await writeFile(resolve(root, "seo-dataset-inventory.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(`Phase 0 dataset discovery passed: ${inventory.calendarRows} calendar rows, ${inventory.firstAd} → ${inventory.lastAd}; inventory written to seo-dataset-inventory.json.`);
