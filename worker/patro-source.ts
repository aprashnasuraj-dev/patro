import type { CalendarRecord, PatroSource, RecordQuery } from "../lib/patro";
import { bsToAd, daysInBsMonth } from "../packages/core/src";
import { calculateAstronomicalTithi } from "./tithi";

type R2ObjectLike={text():Promise<string>};
type R2Like={get(key:string):Promise<R2ObjectLike|null>};
export type PatroEnv = { DB?: any; ARCHIVE?:R2Like };
const CALENDAR_PREFIX="datasets/calendar/v1";

function parse(row: any) {
  if (!row) return null;
  const value = row.payload ?? row;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}
function normalizeCalendar(row: any): CalendarRecord | null {
  const value = parse(row);
  if (!value) return null;
  const payload = value.payload && typeof value.payload === "object" ? value.payload : value;
  const ad = String(payload.ad || value.ad_date || "").slice(0, 10);
  const bs = payload.bs;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ad) || !bs?.year || !bs?.month || !bs?.day) return null;
  return { ...payload, ad, bs, ns: payload.ns || payload.nepal_sambat || null, panchang: payload.panchang || null };
}
async function all(db: any, sql: string, bindings: any[] = []) {
  const out = await db.prepare(sql).bind(...bindings).all();
  return (out.results || []).map(parse).filter(Boolean);
}
function bsRange(year:number,month?:number){
  try{
    const startMonth=month||1,endMonth=month||12;
    const start=bsToAd({year,month:startMonth,day:1});
    const end=bsToAd({year,month:endMonth,day:daysInBsMonth(year,endMonth)});
    return {start,end};
  }catch{return null;}
}
async function r2Year(env:PatroEnv,calendar:"ad"|"bs",year:number):Promise<CalendarRecord[]|null>{
  if(!env.ARCHIVE)return null;
  try{
    const object=await env.ARCHIVE.get(`${CALENDAR_PREFIX}/${calendar}/${year}.json`);if(!object)return null;
    const doc=JSON.parse(await object.text());
    if(Number(doc?.schema)!==1||doc?.calendar!==calendar||Number(doc?.year)!==year||!Array.isArray(doc?.rows))return null;
    return doc.rows.map(normalizeCalendar).filter(Boolean) as CalendarRecord[];
  }catch{return null;}
}

export function createD1PatroSource(env: PatroEnv): PatroSource {
  const db = env.DB;
  return {
    async getCalendarByAd(adIso) {
      if (!db) return null;
      try {
        return normalizeCalendar(await db.prepare(
          "select payload, ad_date from content_records where table_name='astronomy_calendar_map' and record_key=?1 limit 1"
        ).bind(adIso).first());
      } catch { return null; }
    },
    async getCalendarByBs(bsY, bsM, bsD) {
      if (!db) return null;
      try {
        const ad=bsToAd({year:bsY,month:bsM,day:bsD});
        return normalizeCalendar(await db.prepare(
          "select payload, ad_date from content_records where table_name='astronomy_calendar_map' and record_key=?1 limit 1"
        ).bind(ad).first());
      } catch { return null; }
    },
    async getCalendarMonth(bsY, bsM) {
      if (!db) return [];
      const range=bsRange(bsY,bsM);if(!range)return [];
      try {
        const rows = await all(db,
          "select payload, ad_date from content_records where table_name='astronomy_calendar_map' and record_key>=?1 and record_key<=?2 order by record_key",
          [range.start,range.end]
        );
        return rows.map(normalizeCalendar).filter(Boolean) as CalendarRecord[];
      } catch { return []; }
    },
    async getCalendarYear(bsY) {
      if (!db) return [];
      const range=bsRange(bsY);if(!range)return [];
      try {
        const rows = await all(db,
          "select payload, ad_date from content_records where table_name='astronomy_calendar_map' and record_key>=?1 and record_key<=?2 order by record_key",
          [range.start,range.end]
        );
        return rows.map(normalizeCalendar).filter(Boolean) as CalendarRecord[];
      } catch { return []; }
    },
    async listRecords(table: string, query: RecordQuery = {}) {
      if (!db || !/^[a-z0-9_]+$/i.test(table)) return [];
      const where = ["table_name=?1"];
      const bindings: any[] = [table];
      const push = (sql: string, value: any) => { bindings.push(value); where.push(sql.replace("?", `?${bindings.length}`)); };
      if (query.category) push("category=?", query.category);
      if (query.from) push("ad_date>=?", query.from);
      if (query.to) push("ad_date<=?", query.to);
      if (query.year) push("year=?", query.year);
      const limit = Math.min(5000, Math.max(1, Number(query.limit || 500)));
      try {
        return all(db, `select payload from content_records where ${where.join(" and ")} order by ad_date, sort_order desc, record_key limit ${limit}`, bindings);
      } catch { return []; }
    },
    async calculateTithiAt(adIso, lat, lng, calendar) {
      try {
        return calculateAstronomicalTithi({ date:adIso, lat, lng, bsFormatted:calendar.bs?.formatted||null, nsFormatted:calendar.ns?.formatted||calendar.ns?.formatted_ne||null });
      } catch { return calendar.panchang?.tithi || null; }
    }
  };
}

/**
 * Hybrid public source: immutable calendar methods are R2-only; D1 remains available solely
 * through listRecords for mutable/correctable datasets (official facts, overlays, configuration).
 * An R2 miss therefore returns no calendar record instead of silently spending D1 reads.
 */
export function createArchivePatroSource(env:PatroEnv):PatroSource{
  const mutable=createD1PatroSource(env);
  return {
    ...mutable,
    async getCalendarByAd(adIso){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(adIso))return null;
      const rows=await r2Year(env,"ad",Number(adIso.slice(0,4)));if(!rows)return null;
      return rows.find((row)=>row.ad===adIso)||null;
    },
    async getCalendarByBs(bsY,bsM,bsD){
      const rows=await r2Year(env,"bs",bsY);if(!rows)return null;
      return rows.find((row)=>Number(row.bs?.year)===bsY&&Number(row.bs?.month)===bsM&&Number(row.bs?.day)===bsD)||null;
    },
    async getCalendarMonth(bsY,bsM){
      const rows=await r2Year(env,"bs",bsY);if(!rows)return [];
      return rows.filter((row)=>Number(row.bs?.month)===bsM);
    },
    async getCalendarYear(bsY){
      return await r2Year(env,"bs",bsY)||[];
    }
  };
}
