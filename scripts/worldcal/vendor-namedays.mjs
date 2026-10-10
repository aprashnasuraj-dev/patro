#!/usr/bin/env node
// Re-creates worker/worldcal/data/namedays/*.json from pinned npm packages (downloaded with `npm pack`).
// The packages are NOT runtime dependencies; this script only normalises and corrects their data.
//
//   mkdir /tmp/nd && cd /tmp/nd && npm pack namedays-cs@1.2.1 name-day-calendar@1.1.1 nevnap@1.1.1 namedays@5.0.1
//   for f in *.tgz; do mkdir -p "${f%.tgz}" && tar -xzf "$f" -C "${f%.tgz}"; done
//   node scripts/worldcal/vendor-namedays.mjs /tmp/nd
//
// Licensing (see docs/worldcal/PLAN.md §4): the Czech and Hungarian packages state their names come from Wikipedia,
// so their data is treated as CC BY-SA 4.0 (attribution + share-alike) regardless of the packages' MIT code licence.
// The Slovak package follows the Ministry of Culture (MK SR) calendar; facts/information are not protected (§ 5 Act 185/2015).
// Poland: traditional name-day facts from the MIT-licensed namedays package (upstream source not stated).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SRC = resolve(process.argv[2] || ".");
const OUT = resolve("worker/worldcal/data/namedays");
const pad = (n) => String(n).padStart(2, "0");
const ALL_DAYS = [];
for (let m = 1; m <= 12; m++) for (let d = 1; d <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; d++) ALL_DAYS.push(`${pad(m)}-${pad(d)}`);

function finish(days) {
  const out = {};
  for (const k of ALL_DAYS) out[k] = [...new Set((days[k] || []).map((n) => String(n).normalize("NFC").trim()).filter(Boolean))];
  return out;
}

async function czech() {
  const raw = JSON.parse(await readFile(join(SRC, "namedays-cs-1.2.1/package/dist/names.json"), "utf8"));
  const days = {};
  for (const [k, v] of Object.entries(raw)) days[k] = (Array.isArray(v) ? v : [v]).filter((n) => n !== "Hromnice"); // Hromnice is a feast, not a name
  return {
    country: "czech-republic", code: "CZ", lang: "cs", tz: "Europe/Prague", leapRule: "fixed",
    source: { name: "Jmeniny v Česku (Czech Wikipedia), via namedays-cs 1.2.1", url: "https://cs.wikipedia.org/wiki/Jmeniny_v_%C4%8Cesku", package: "https://github.com/OzzyCzech/namedays-cs" },
    license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
    reviewNotes: ["A second package (namedays 5.0.1) differs on 65 dates, mostly whether female variants are listed. Native review against a current printed calendar is required before indexing."],
    days: finish(days),
  };
}

async function slovak() {
  const mod = await import(pathToFileURL(join(SRC, "name-day-calendar-1.1.1/package/dist/index.mjs")).href);
  const days = {};
  for (const k of ALL_DAYS) days[k] = ((await mod.getNameOnDate(k, { lang: "SK" })) || []).map((n) => (n === "Akexia" ? "Alexia" : n));
  return {
    country: "slovakia", code: "SK", lang: "sk", tz: "Europe/Bratislava", leapRule: "fixed",
    source: { name: "Kalendár mien MK SR (Ministry of Culture calendar commission), via name-day-calendar 1.1.1", url: "https://www.culture.gov.sk/", package: "https://github.com/peterknezek/name-day-calendar" },
    license: { name: "Public information (Slovak Copyright Act 185/2015 § 5)", url: "https://www.zakonypreludi.sk/zz/2015-185" },
    reviewNotes: ["Fixed typo Akexia → Alexia (9 Jan).", "Check post-2020 MK SR additions (2023 update) before indexing."],
    days: finish(days),
  };
}

async function hungarian() {
  const js = await readFile(join(SRC, "nevnap-1.1.1/package/dist/index.js"), "utf8");
  const m = js.match(/JSON\.parse\('(.*?)'\)\}\}/s);
  if (!m) throw new Error("nevnap data not found");
  const months = JSON.parse(m[1]);
  // Verified upstream defect: May has 32 entries; an empty array sits at index 7 (8 May), shifting the rest of May by a day.
  if (months[4].length === 32 && months[4][7].length === 0) months[4].splice(7, 1);
  const days = {};
  months.forEach((list, mi) => list.forEach((names, di) => {
    days[`${pad(mi + 1)}-${pad(di + 1)}`] = names.flatMap((n) => (n === "PannaAnna" ? ["Anna", "Panna"] : [n]));
  }));
  for (const [i, len] of months.map((x, i) => [i, x.length])) {
    const expected = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i];
    if (len !== expected) throw new Error(`HU month ${i + 1} has ${len} days`);
  }
  return {
    country: "hungary", code: "HU", lang: "hu", tz: "Europe/Budapest", leapRule: "hu-shift",
    source: { name: "Magyar névnapok listája dátum szerint (Hungarian Wikipedia), via nevnap 1.1.1", url: "https://hu.wikipedia.org/wiki/Magyar_n%C3%A9vnapok_list%C3%A1ja_d%C3%A1tum_szerint", package: "https://github.com/nevadavid/nevnap" },
    license: { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
    reviewNotes: ["Removed the stray empty 8 May entry (upstream bug shifted 8–31 May by one day).", "Split typo 'PannaAnna' (26 Jul) into Anna, Panna.", "Leap years: 24 Feb has no name day and 24–28 Feb names move to 25–29 Feb."],
    days: finish(days),
  };
}

async function polish() {
  const mod = await import(pathToFileURL(join(SRC, "namedays-5.0.1/package/dist/index.mjs")).href);
  const days = {};
  for (const n of mod.namedays.all({ countryCode: "PL" })) (days[`${pad(n.month)}-${pad(n.day)}`] ||= []).push(n.name);
  return {
    country: "poland", code: "PL", lang: "pl", tz: "Europe/Warsaw", leapRule: "fixed",
    source: { name: "Traditional Polish name-day calendar, via namedays 5.0.1", url: "https://github.com/filiptammergard/namedays", package: "https://github.com/filiptammergard/namedays" },
    license: { name: "MIT (package); name-day dates are traditional facts", url: "https://github.com/filiptammergard/namedays/blob/main/LICENSE" },
    reviewNotes: ["Up to 18 names per day; people celebrate the date nearest after their birthday. Cross-check against a printed calendar when convenient."],
    days: finish(days),
  };
}

await mkdir(OUT, { recursive: true });
for (const build of [czech, slovak, hungarian, polish]) {
  const data = await build();
  const names = new Set(Object.values(data.days).flat());
  data.stats = { names: names.size, assignments: Object.values(data.days).reduce((s, v) => s + v.length, 0), emptyDays: Object.entries(data.days).filter(([, v]) => !v.length).map(([k]) => k) };
  await writeFile(join(OUT, `${data.country}.json`), JSON.stringify(data, null, 1) + "\n");
  console.log(`${data.country}: ${data.stats.names} names, ${data.stats.assignments} assignments, empty: ${data.stats.emptyDays.join(" ")}`);
}
