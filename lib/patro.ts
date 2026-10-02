export type CalendarRecord = {
  ad: string;
  bs: { year: number; month: number; day: number; formatted?: string; month_ne?: string };
  ns?: any;
  panchang?: any;
  [key: string]: any;
};

export type RecordQuery = {
  year?: number;
  category?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type PatroSource = {
  getCalendarByAd(adIso: string): Promise<CalendarRecord | null>;
  getCalendarByBs(bsY: number, bsM: number, bsD: number): Promise<CalendarRecord | null>;
  getCalendarMonth(bsY: number, bsM: number): Promise<CalendarRecord[]>;
  getCalendarYear(bsY: number): Promise<CalendarRecord[]>;
  listRecords(table: string, query?: RecordQuery): Promise<any[]>;
  calculateTithiAt?: (adIso: string, lat: number, lng: number, calendar: CalendarRecord) => Promise<any>;
};

export type CitySpec = {
  slug: string;
  name: string;
  country: string;
  timeZone: string;
  lat: number;
  lng: number;
};

export const PATRO_CITIES: CitySpec[] = [
  { slug: "kathmandu", name: "Kathmandu", country: "Nepal", timeZone: "Asia/Kathmandu", lat: 27.7172, lng: 85.3240 },
  { slug: "pokhara", name: "Pokhara", country: "Nepal", timeZone: "Asia/Kathmandu", lat: 28.2096, lng: 83.9856 },
  { slug: "biratnagar", name: "Biratnagar", country: "Nepal", timeZone: "Asia/Kathmandu", lat: 26.4525, lng: 87.2718 },
  { slug: "butwal", name: "Butwal", country: "Nepal", timeZone: "Asia/Kathmandu", lat: 27.7006, lng: 83.4484 },
  { slug: "new-york", name: "New York", country: "United States", timeZone: "America/New_York", lat: 40.7128, lng: -74.0060 },
  { slug: "toronto", name: "Toronto", country: "Canada", timeZone: "America/Toronto", lat: 43.6532, lng: -79.3832 },
  { slug: "london", name: "London", country: "United Kingdom", timeZone: "Europe/London", lat: 51.5072, lng: -0.1276 },
  { slug: "sydney", name: "Sydney", country: "Australia", timeZone: "Australia/Sydney", lat: -33.8688, lng: 151.2093 },
  { slug: "melbourne", name: "Melbourne", country: "Australia", timeZone: "Australia/Melbourne", lat: -37.8136, lng: 144.9631 },
  { slug: "tokyo", name: "Tokyo", country: "Japan", timeZone: "Asia/Tokyo", lat: 35.6762, lng: 139.6503 },
  { slug: "seoul", name: "Seoul", country: "South Korea", timeZone: "Asia/Seoul", lat: 37.5665, lng: 126.9780 },
  { slug: "doha", name: "Doha", country: "Qatar", timeZone: "Asia/Qatar", lat: 25.2854, lng: 51.5310 },
  { slug: "dubai", name: "Dubai", country: "United Arab Emirates", timeZone: "Asia/Dubai", lat: 25.2048, lng: 55.2708 },
  { slug: "riyadh", name: "Riyadh", country: "Saudi Arabia", timeZone: "Asia/Riyadh", lat: 24.7136, lng: 46.6753 },
  { slug: "kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia", timeZone: "Asia/Kuala_Lumpur", lat: 3.1390, lng: 101.6869 },
  { slug: "kuwait-city", name: "Kuwait City", country: "Kuwait", timeZone: "Asia/Kuwait", lat: 29.3759, lng: 47.9774 }
];

const cityBySlug = new Map(PATRO_CITIES.map((city) => [city.slug, city]));
const validAd = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const validBs = (y: number, m: number, d: number) => Number.isInteger(y) && y > 1900 && Number.isInteger(m) && m >= 1 && m <= 12 && Number.isInteger(d) && d >= 1 && d <= 32;

function normalizeSlug(value: unknown) {
  return String(value || "").trim().toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function rowSlug(row: any) {
  return normalizeSlug(row?.slug || row?.key || row?.id || row?.festival_id || row?.name_en || row?.title_en || row?.name_ne || row?.title_ne);
}

export async function getDay(source: PatroSource, bsY: number, bsM: number, bsD: number) {
  if (!validBs(bsY, bsM, bsD)) return null;
  return source.getCalendarByBs(bsY, bsM, bsD);
}

export async function getDayByAd(source: PatroSource, adIso: string) {
  if (!validAd(adIso)) return null;
  return source.getCalendarByAd(adIso);
}

export async function getMonth(source: PatroSource, bsY: number, bsM: number) {
  if (!Number.isInteger(bsY) || !Number.isInteger(bsM) || bsM < 1 || bsM > 12) return [];
  return source.getCalendarMonth(bsY, bsM);
}

export async function getYear(source: PatroSource, bsY: number) {
  if (!Number.isInteger(bsY) || bsY < 1900) return [];
  return source.getCalendarYear(bsY);
}

export async function getHolidays(source: PatroSource, bsY: number) {
  const days = await getYear(source, bsY);
  if (!days.length) return [];
  const from = days[0].ad;
  const to = days[days.length - 1].ad;
  return source.listRecords("holidays", { from, to, limit: 1000 });
}

export async function getFestivals(source: PatroSource, bsY: number) {
  const days = await getYear(source, bsY);
  if (!days.length) return [];
  const from = days[0].ad;
  const to = days[days.length - 1].ad;
  const [facts, holidays] = await Promise.all([
    source.listRecords("official_panchang_facts", { category: "festival", from, to, limit: 1000 }),
    source.listRecords("holidays", { from, to, limit: 1000 })
  ]);
  const seen = new Set<string>();
  return [...facts, ...holidays].filter((row) => {
    const key = String(row?.id || row?.key || `${row?.ad_date || row?.fact_date || row?.date || ""}|${row?.name_ne || row?.name_en || row?.title || ""}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => String(a?.ad_date || a?.fact_date || a?.date || "").localeCompare(String(b?.ad_date || b?.fact_date || b?.date || "")));
}

export async function getFestival(source: PatroSource, slug: string, bsY: number) {
  const target = normalizeSlug(slug);
  if (!target) return null;
  const rows = await getFestivals(source, bsY);
  return rows.find((row) => rowSlug(row) === target || normalizeSlug(row?.name_en).includes(target) || normalizeSlug(row?.title).includes(target)) || null;
}

export async function getSait(source: PatroSource, type: string, bsY: number) {
  const days = await getYear(source, bsY);
  if (!days.length) return [];
  const from = days[0].ad;
  const to = days[days.length - 1].ad;
  const target = normalizeSlug(type);
  const rows = await source.listRecords("official_panchang_facts", { category: "sait", from, to, limit: 2000 });
  if (!target) return rows;
  return rows.filter((row) => {
    const hay = normalizeSlug([row?.key, row?.type, row?.sait_type, row?.name_en, row?.name_ne, row?.title].filter(Boolean).join(" "));
    return hay.includes(target);
  });
}

export async function convertBsToAd(source: PatroSource, bs: { year: number; month: number; day: number } | string) {
  const parts = typeof bs === "string" ? bs.split("-").map(Number) : [bs.year, bs.month, bs.day];
  const row = await getDay(source, parts[0], parts[1], parts[2]);
  return row ? { ad: row.ad, bs: row.bs, ns: row.ns || null, panchang: row.panchang || null } : null;
}

export async function convertAdToBs(source: PatroSource, ad: string) {
  const row = await getDayByAd(source, ad);
  return row ? { ad: row.ad, bs: row.bs, ns: row.ns || null, panchang: row.panchang || null } : null;
}

export function kathmanduTodayIso(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export async function getTodayNepal(source: PatroSource, now = new Date()) {
  return getDayByAd(source, kathmanduTodayIso(now));
}

export async function getTithiAt(source: PatroSource, citySlug: string, date: string) {
  const city = cityBySlug.get(normalizeSlug(citySlug));
  if (!city) return null;
  let calendar: CalendarRecord | null = null;
  if (validAd(date)) calendar = await getDayByAd(source, date);
  else {
    const match = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) calendar = await getDay(source, Number(match[1]), Number(match[2]), Number(match[3]));
  }
  if (!calendar) return null;
  const calculated = source.calculateTithiAt ? await source.calculateTithiAt(calendar.ad, city.lat, city.lng, calendar) : null;
  return {
    city,
    ad: calendar.ad,
    bs: calendar.bs,
    ns: calendar.ns || null,
    tithi: calculated || calendar.panchang?.tithi || calendar.panchang?.tithi_name_ne || null,
    panchang: calendar.panchang || null,
    nepal_date_boundary: "Asia/Kathmandu",
    local_display_time_zone: city.timeZone
  };
}

export function createPatroAdapter(source: PatroSource) {
  return {
    getDay: (bsY: number, bsM: number, bsD: number) => getDay(source, bsY, bsM, bsD),
    getDayByAd: (adIso: string) => getDayByAd(source, adIso),
    getMonth: (bsY: number, bsM: number) => getMonth(source, bsY, bsM),
    getYear: (bsY: number) => getYear(source, bsY),
    getFestivals: (bsY: number) => getFestivals(source, bsY),
    getFestival: (slug: string, bsY: number) => getFestival(source, slug, bsY),
    getSait: (type: string, bsY: number) => getSait(source, type, bsY),
    getHolidays: (bsY: number) => getHolidays(source, bsY),
    convertBsToAd: (bs: { year: number; month: number; day: number } | string) => convertBsToAd(source, bs),
    convertAdToBs: (ad: string) => convertAdToBs(source, ad),
    getTodayNepal: (now = new Date()) => getTodayNepal(source, now),
    getTithiAt: (city: string, date: string) => getTithiAt(source, city, date)
  };
}

export type PatroAdapter = ReturnType<typeof createPatroAdapter>;
