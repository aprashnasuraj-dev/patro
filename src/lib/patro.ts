export type BsDate = { year: number; month: number; day: number; formatted?: string; [key: string]: unknown };
export type PatroDay = { ad: string; bs: BsDate; ns?: unknown; nepal_sambat?: unknown; panchang?: Record<string, unknown>; [key: string]: unknown };
export type PatroFestival = { id?: string; key?: string; slug?: string; ad_date?: string; fact_date?: string; date?: string; name_ne?: string; name_en?: string; title_ne?: string; title?: string; [key: string]: unknown };
export type PatroSait = Record<string, unknown>;

export type PatroSource = {
  dayByAd(adIso: string): Promise<PatroDay | null>;
  dayByBs(year: number, month: number, day: number): Promise<PatroDay | null>;
  monthByBs(year: number, month: number): Promise<PatroDay[]>;
  festivalsBetween(fromAd: string, toAd: string): Promise<PatroFestival[]>;
  holidaysBetween(fromAd: string, toAd: string): Promise<PatroFestival[]>;
  saitBetween(type: string, fromAd: string, toAd: string): Promise<PatroSait[]>;
  tithiAt?(city: PatroCity, adIso: string): Promise<Record<string, unknown> | null>;
};

export const KATHMANDU_TIME_ZONE = "Asia/Kathmandu";

export const PATRO_CITIES = {
  kathmandu: { label: "Kathmandu", country: "Nepal", timeZone: "Asia/Kathmandu" },
  pokhara: { label: "Pokhara", country: "Nepal", timeZone: "Asia/Kathmandu" },
  biratnagar: { label: "Biratnagar", country: "Nepal", timeZone: "Asia/Kathmandu" },
  butwal: { label: "Butwal", country: "Nepal", timeZone: "Asia/Kathmandu" },
  "new-york": { label: "New York", country: "United States", timeZone: "America/New_York" },
  toronto: { label: "Toronto", country: "Canada", timeZone: "America/Toronto" },
  london: { label: "London", country: "United Kingdom", timeZone: "Europe/London" },
  sydney: { label: "Sydney", country: "Australia", timeZone: "Australia/Sydney" },
  melbourne: { label: "Melbourne", country: "Australia", timeZone: "Australia/Melbourne" },
  tokyo: { label: "Tokyo", country: "Japan", timeZone: "Asia/Tokyo" },
  seoul: { label: "Seoul", country: "South Korea", timeZone: "Asia/Seoul" },
  doha: { label: "Doha", country: "Qatar", timeZone: "Asia/Qatar" },
  dubai: { label: "Dubai", country: "United Arab Emirates", timeZone: "Asia/Dubai" },
  riyadh: { label: "Riyadh", country: "Saudi Arabia", timeZone: "Asia/Riyadh" },
  "kuala-lumpur": { label: "Kuala Lumpur", country: "Malaysia", timeZone: "Asia/Kuala_Lumpur" },
  "kuwait-city": { label: "Kuwait City", country: "Kuwait", timeZone: "Asia/Kuwait" }
} as const;

export type PatroCity = keyof typeof PATRO_CITIES;

function validAd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function festivalDate(item: PatroFestival) {
  return String(item.ad_date || item.fact_date || item.date || "");
}

function normalizeName(value: unknown) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function festivalKeys(item: PatroFestival) {
  return [item.slug, item.key, item.id, item.name_en, item.name_ne, item.title, item.title_ne]
    .map(normalizeName)
    .filter(Boolean);
}

function nextAd(adIso: string, deltaDays: number) {
  const date = new Date(adIso + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

async function bsYearBounds(source: PatroSource, year: number) {
  const first = await source.dayByBs(year, 1, 1);
  const next = await source.dayByBs(year + 1, 1, 1);
  if (!first?.ad || !next?.ad) throw new Error(`BS year ${year} is outside the trusted calendar archive`);
  return { from: first.ad, to: nextAd(next.ad, -1) };
}

export function createPatroAdapter(source: PatroSource) {
  return {
    async getDay(bsY: number, bsM: number, bsD: number) {
      if (![bsY, bsM, bsD].every(Number.isInteger) || bsM < 1 || bsM > 12 || bsD < 1 || bsD > 32) return null;
      return source.dayByBs(bsY, bsM, bsD);
    },

    async getDayByAd(adIso: string) {
      if (!validAd(adIso)) return null;
      return source.dayByAd(adIso);
    },

    async getMonth(bsY: number, bsM: number) {
      if (!Number.isInteger(bsY) || !Number.isInteger(bsM) || bsM < 1 || bsM > 12) return [];
      return source.monthByBs(bsY, bsM);
    },

    async getYear(bsY: number) {
      if (!Number.isInteger(bsY)) return [];
      const months = await Promise.all(Array.from({ length: 12 }, (_, index) => source.monthByBs(bsY, index + 1)));
      return months.flat();
    },

    async getFestivals(bsY: number) {
      const { from, to } = await bsYearBounds(source, bsY);
      return source.festivalsBetween(from, to);
    },

    async getFestival(slug: string, bsY: number) {
      const target = normalizeName(slug);
      if (!target) return null;
      const items = await this.getFestivals(bsY);
      return items.find((item) => festivalKeys(item).some((key) => key === target || key.includes(target) || target.includes(key))) || null;
    },

    async getSait(type: string, bsY: number) {
      const { from, to } = await bsYearBounds(source, bsY);
      return source.saitBetween(type, from, to);
    },

    async getHolidays(bsY: number) {
      const { from, to } = await bsYearBounds(source, bsY);
      return source.holidaysBetween(from, to);
    },

    async convertBsToAd(bs: BsDate | string) {
      const parts = typeof bs === "string" ? bs.split("-").map(Number) : [bs.year, bs.month, bs.day];
      if (parts.length !== 3) return null;
      const day = await this.getDay(parts[0], parts[1], parts[2]);
      return day?.ad || null;
    },

    async convertAdToBs(adIso: string) {
      const day = await this.getDayByAd(adIso);
      return day?.bs || null;
    },

    async getTodayNepal() {
      const adIso = new Intl.DateTimeFormat("en-CA", {
        timeZone: KATHMANDU_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
      return this.getDayByAd(adIso);
    },

    async getTithiAt(city: PatroCity, adIso: string) {
      if (!PATRO_CITIES[city] || !validAd(adIso)) return null;
      if (source.tithiAt) return source.tithiAt(city, adIso);
      const day = await source.dayByAd(adIso);
      if (!day) return null;
      return {
        city,
        cityLabel: PATRO_CITIES[city].label,
        timeZone: PATRO_CITIES[city].timeZone,
        calendarBoundary: KATHMANDU_TIME_ZONE,
        panchang: day.panchang || null,
        note: "Calendar-day identity is anchored to Nepal time; archive panchang values are not relabeled as city-local astronomical observations."
      };
    }
  };
}

export type PatroAdapter = ReturnType<typeof createPatroAdapter>;
export const getFestivalDate = festivalDate;
