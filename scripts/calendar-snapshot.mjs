import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const calendarDir = resolve(root, "migration/data/public/astronomy_calendar_map");
const holidaysPath = resolve(root, "migration/data/public/holidays.json");

function payload(row) {
  return row?.payload && typeof row.payload === "object" ? row.payload : row;
}

export async function loadCalendarSnapshot() {
  const names = (await readdir(calendarDir)).filter((name) => name.endsWith(".json")).sort();
  const rows = [];
  for (const name of names) {
    const doc = JSON.parse(await readFile(resolve(calendarDir, name), "utf8"));
    if (doc.table !== "astronomy_calendar_map" || !Array.isArray(doc.rows)) continue;
    for (const row of doc.rows) {
      const value = payload(row);
      const ad = String(value?.ad || row?.ad_date || "").slice(0, 10);
      const bs = value?.bs;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ad) || !bs?.year || !bs?.month || !bs?.day) continue;
      rows.push({ ad, bs, ns: value?.ns || null, panchang: value?.panchang || null });
    }
  }
  rows.sort((a, b) => a.ad.localeCompare(b.ad));
  if (!rows.length) throw new Error("SEO calendar snapshot is empty");
  return rows;
}

export async function loadHolidayMap() {
  const doc = JSON.parse(await readFile(holidaysPath, "utf8"));
  const map = new Map();
  if (doc.table !== "holidays" || !Array.isArray(doc.rows)) return map;
  for (const row of doc.rows) {
    const value = payload(row);
    const ad = String(value?.ad_date || value?.date || row?.ad_date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ad)) continue;
    const name = value?.name_ne || value?.title_ne || value?.name_en || value?.title || "";
    if (!name) continue;
    const list = map.get(ad) || [];
    list.push({
      name: String(name),
      nameEn: String(value?.name_en || value?.title || ""),
      effect: String(value?.effect || value?.status || ""),
      source: String(value?.source_title || value?.source_url || "")
    });
    map.set(ad, list);
  }
  return map;
}

export function tithiText(panchang) {
  const t = panchang?.tithi;
  if (typeof t === "string") return t;
  return String(t?.ne || t?.name_ne || t?.tithi_name_ne || panchang?.tithi_name_ne || panchang?.tithi_ne || "").trim();
}

export function nsText(ns) {
  if (!ns) return "";
  if (typeof ns === "string") return ns;
  return String(ns.formatted_ne || ns.formatted || [ns.year, ns.month?.dev || ns.month?.roman, ns.day || ns.tithi_name_ne].filter(Boolean).join(" ")).trim();
}
