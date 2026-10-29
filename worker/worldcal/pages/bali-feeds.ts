import { NYEPI, OTHER_BALI_DAYS, PURNAMA_TILEM } from "../data/bali-saka";
import { isoToJdn, jdnToIso, parseIso, todayIn } from "../dates";
import { otonanDates, pawukon, pawukonHolidaysInYear, PAWUKON_HOLIDAYS, TUMPEK } from "../engines/pawukon";
import { renderIcsCalendar, type IcsEvent } from "../ics";
import { BALI_PIODALAN, nextPawukonPiodalan } from "../data/bali-piodalan";
import type { Ctx, Rendered } from "../types";

const BP = "/bali-calendar";
const TZ = "Asia/Makassar";
const BALI_RANGE = { minYear: 1929, maxYear: 2129 };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const uid = (scope: string, name: string, date: string) => `bali-${scope}-${slug(name)}-${date}@aafnaipatro.com`;

function rendered(name: string, events: IcsEvent[], ctx: Ctx, maxAge = 86400): Rendered {
  return {
    status: 200,
    html: renderIcsCalendar(name, events, ctx.now),
    maxAge,
    indexable: false,
    contentType: "text/calendar; charset=utf-8",
  };
}

export function majorHolidayEvents(year: number): IcsEvent[] {
  const out: IcsEvent[] = [];
  for (const row of pawukonHolidaysInYear(year)) {
    const date = jdnToIso(row.jdn);
    for (const name of row.names) out.push({
      uid: uid("holiday", name, date),
      date,
      summary: name,
      description: "Status sumber: calculated. Pawukon berulang setiap 210 hari.",
    });
  }
  const ny = NYEPI[year];
  if (ny) out.push({
    uid: uid("holiday", "Hari Raya Nyepi", ny.date),
    date: ny.date,
    summary: ny.status === "provisional" ? "Hari Raya Nyepi (perkiraan)" : "Hari Raya Nyepi",
    description: `Status sumber: ${ny.status}. Sumber: ${ny.source}.`,
  });
  for (const row of OTHER_BALI_DAYS[year] || []) out.push({
    uid: uid("holiday", row.name, row.date),
    date: row.date,
    summary: row.name,
    description: `Status sumber: published. Sumber: ${row.source}.`,
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.summary.localeCompare(b.summary));
}

export function moonEvents(year: number): IcsEvent[] {
  const row = PURNAMA_TILEM[year];
  if (!row) return [];
  const out: IcsEvent[] = [];
  for (const date of row.purnama) out.push({
    uid: uid("purnama", "Purnama", date), date, summary: "Purnama",
    description: `Status sumber: published. Sumber: ${row.source}.`,
  });
  for (const date of row.tilem) out.push({
    uid: uid("tilem", "Tilem", date), date, summary: "Tilem",
    description: `Status sumber: published. Sumber: ${row.source}.`,
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function selectedRerainan(key: string, year: number): IcsEvent[] | null {
  const known = [
    ...PAWUKON_HOLIDAYS.map((h) => ({ key: h.key, name: h.id })),
    ...TUMPEK.map((h) => ({ key: slug(h.id), name: h.id })),
  ];
  const target = known.find((x) => x.key === key);
  if (!target) return null;
  const events: IcsEvent[] = [];
  for (const row of pawukonHolidaysInYear(year)) {
    if (!row.names.includes(target.name)) continue;
    const date = jdnToIso(row.jdn);
    events.push({
      uid: uid("rerainan", target.name, date), date, summary: target.name,
      description: "Status sumber: calculated. Pawukon berulang setiap 210 hari.",
    });
  }
  return events;
}

function otonanFeed(ctx: Ctx): Rendered | null {
  const lahir = ctx.url.searchParams.get("lahir") || "";
  const p = parseIso(lahir);
  if (!p || p.y < BALI_RANGE.minYear || p.y > BALI_RANGE.maxYear) return null;
  const beforeSunrise = ctx.url.searchParams.get("sebelum_subuh") === "1";
  const birthJdn = isoToJdn(lahir) - (beforeSunrise ? 1 : 0);
  const today = todayIn(TZ, ctx.now);
  const pw = pawukon(birthJdn);
  const dates = otonanDates(birthJdn, isoToJdn(today), 20);
  const label = `Otonan — ${pw.saptawara} ${pw.pancawara} ${pw.wuku.name}`;
  const events = dates.map((j, i) => {
    const date = jdnToIso(j);
    return {
      uid: `bali-otonan-${lahir}-${beforeSunrise ? "pre-sunrise" : "civil"}-${date}@aafnaipatro.com`,
      date,
      summary: label,
      description: `Otonan ke-${Math.round((j - birthJdn) / 210)}. Perhitungan 210 hari dari tanggal lahir${beforeSunrise ? "; kelahiran sebelum matahari terbit memakai hari Bali sebelumnya" : ""}.`,
      sequence: 0,
    };
  });
  return rendered("Otonan Bali", events, ctx, 3600);
}

function piodalanFeed(ctx: Ctx, rawSlug: string): Rendered | null {
  const slugValue = rawSlug.replace(/\.ics$/, "");
  const item = BALI_PIODALAN.find((x) => x.slug === slugValue);
  if (!item || item.rule.type !== "pawukon") return null;
  const today = todayIn(TZ, ctx.now);
  const dates = nextPawukonPiodalan(item.rule, isoToJdn(today), 20);
  const events: IcsEvent[] = dates.map((j) => {
    const date = jdnToIso(j);
    return {
      uid: `bali-piodalan-${item.slug}-${date}@aafnaipatro.com`,
      date,
      summary: `Piodalan — ${item.name}`,
      description: `Status rule: ${item.source.status}. Sumber: ${item.source.authority}. Pawukon ${item.rule.saptawara} ${item.rule.pancawara}, Wuku ${item.rule.wuku}; recurrence 210 hari.`,
    };
  });
  return rendered(`Piodalan — ${item.name}`, events, ctx, 3600);
}

export function baliFeedRoute(ctx: Ctx, rest: string[]): Rendered | null {
  if (rest.length === 3 && rest[0] === "feed" && rest[1] === "hari-raya" && /^\d{4}\.ics$/.test(rest[2])) {
    const year = Number(rest[2].slice(0, 4));
    if (year < BALI_RANGE.minYear || year > BALI_RANGE.maxYear) return null;
    return rendered(`Hari Raya Bali ${year}`, majorHolidayEvents(year), ctx);
  }
  if (rest.length === 3 && rest[0] === "feed" && rest[1] === "purnama-tilem" && /^\d{4}\.ics$/.test(rest[2])) {
    const year = Number(rest[2].slice(0, 4));
    const events = moonEvents(year);
    return events.length ? rendered(`Purnama & Tilem Bali ${year}`, events, ctx) : null;
  }
  if (rest.length === 2 && rest[0] === "feed" && rest[1] === "otonan.ics") return otonanFeed(ctx);
  if (rest.length === 3 && rest[0] === "feed" && rest[1] === "piodalan" && /^[a-z0-9-]+\.ics$/.test(rest[2])) return piodalanFeed(ctx, rest[2]);
  if (rest.length === 4 && rest[0] === "feed" && rest[1] === "rerainan" && /^\d{4}\.ics$/.test(rest[3])) {
    const year = Number(rest[3].slice(0, 4));
    const events = selectedRerainan(rest[2], year);
    return events ? rendered(`Rerainan Bali — ${rest[2]} ${year}`, events, ctx) : null;
  }
  return null;
}

export const baliFeedExamples = [
  `${BP}/feed/hari-raya/2027.ics`,
  `${BP}/feed/purnama-tilem/2027.ics`,
  `${BP}/feed/otonan.ics?lahir=2000-01-01`,
  `${BP}/feed/piodalan/pura-luhur-batukaru.ics`,
  `${BP}/feed/rerainan/galungan/2027.ics`,
];
