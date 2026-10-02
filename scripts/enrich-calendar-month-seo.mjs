import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BS_MONTHS, INDEXED_CALENDAR_YEARS, calendarRoute } from "./seo-config.mjs";
import { loadCalendarSnapshot, loadHolidayMap, tithiText } from "./calendar-snapshot.mjs";

const root = process.cwd();
const rows = await loadCalendarSnapshot();
const holidays = await loadHolidayMap();
const indexedYears = new Set(INDEXED_CALENDAR_YEARS);

const groups = new Map();
for (const row of rows) {
  const year = Number(row.bs?.year), month = Number(row.bs?.month);
  if (!indexedYears.has(year) || month < 1 || month > 12) continue;
  const key = `${year}-${month}`;
  const list = groups.get(key) || [];
  list.push(row);
  groups.set(key, list);
}

const DEV = ["०","१","२","३","४","५","६","७","८","९"];
const toDev = (value) => String(value).replace(/\d/g, (d) => DEV[Number(d)]);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const shortAd = (ad) => new Intl.DateTimeFormat("en-GB", { timeZone:"UTC", day:"numeric", month:"short", year:"numeric" }).format(new Date(ad + "T00:00:00Z"));

let count = 0;
for (const year of INDEXED_CALENDAR_YEARS) {
  for (let monthNo = 1; monthNo <= 12; monthNo++) {
    const month = BS_MONTHS[monthNo - 1];
    const list = groups.get(`${year}-${monthNo}`) || [];
    if (list.length < 27) throw new Error(`SEO month ${year}/${monthNo} has only ${list.length} factual day rows`);
    const file = resolve(root, "dist", ...calendarRoute(year, monthNo).split("/").filter(Boolean), "index.html");
    let html = await readFile(file, "utf8");
    if (!html.includes('data-seo-prerender="true"')) throw new Error(`Missing SEO prerender marker in ${file}`);

    const items = list.map((row) => {
      const tithi = tithiText(row.panchang);
      const names = (holidays.get(row.ad) || []).map((h) => h.name).filter(Boolean).slice(0, 2);
      const details = [shortAd(row.ad), tithi, ...names].filter(Boolean).join(" · ");
      return `<li><a href="/date/${esc(row.ad)}"><strong>${esc(toDev(row.bs.day))} ${esc(month.ne)}</strong> <span>${esc(details)}</span></a></li>`;
    }).join("");

    const section = `<section class="seo-calendar-days" aria-labelledby="seo-days-${year}-${monthNo}"><h2 id="seo-days-${year}-${monthNo}">${esc(month.ne)} ${toDev(year)} का दैनिक मितिहरू</h2><p>${esc(month.aliases)} ${year} / Nepali Calendar ${year}: प्रत्येक दिनको English date, तिथि र उपलब्ध चाडपर्व/बिदा विवरण हेर्नुहोस्।</p><ol>${items}</ol></section>`;
    html = html.replace("</article></main>", `${section}</article></main>`);
    await writeFile(file, html, "utf8");
    count++;
  }
}
console.log(`Enriched ${count} indexed calendar month pages with factual day links.`);
