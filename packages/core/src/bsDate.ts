export interface BsDate {
  year: number;
  month: number;
  day: number;
}

export type BsDateConfidence = "validated-project-archive" | "provisional-open-table";

export interface BsDateMetadata {
  confidence: BsDateConfidence;
  source: string;
  note: string;
}

export const BS_MIN_YEAR = 1970;
export const BS_VALIDATED_THROUGH_YEAR = 2093;
export const BS_MAX_YEAR = 2099;
export const BS_ANCHOR = Object.freeze({
  bs: Object.freeze({ year: 1970, month: 1, day: 1 }),
  ad: "1913-04-13",
});

/**
 * BS month lengths.
 *
 * Provenance:
 * - 1970–1974: derived from the project's astronomy_calendar_map archive.
 * - 1975–2093: amitgaru/nepali-datetime calendar_bs.csv, cross-checked
 *   against all 1,428 corresponding months in astronomy_calendar_map
 *   with zero mismatches.
 * - 2094–2099: amitgaru/nepali-datetime calendar_bs.csv. These future
 *   rows are usable for deterministic offline conversion but are tagged
 *   provisional because independent open tables can disagree in this range.
 */
export const BS_MONTH_LENGTHS: Readonly<Record<number, readonly number[]>> = Object.freeze({
  1970: [31,31,32,31,31,31,30,29,30,29,30,30],
  1971: [31,31,32,31,32,30,30,29,30,29,30,30],
  1972: [31,32,31,32,31,30,30,30,29,29,30,31],
  1973: [30,32,31,32,31,30,30,30,29,30,29,31],
  1974: [31,31,32,31,31,31,30,29,30,29,30,30],
  1975: [31,31,32,32,31,30,30,29,30,29,30,30],
  1976: [31,32,31,32,31,30,30,30,29,29,30,31],
  1977: [30,32,31,32,31,30,30,30,29,30,29,31],
  1978: [31,31,32,31,31,31,30,29,30,29,30,30],
  1979: [31,31,32,32,31,30,30,29,30,29,30,30],
  1980: [31,32,31,32,31,30,30,30,29,29,30,31],
  1981: [31,31,31,32,31,31,29,30,30,29,30,30],
  1982: [31,31,32,31,31,31,30,29,30,29,30,30],
  1983: [31,31,32,32,31,30,30,29,30,29,30,30],
  1984: [31,32,31,32,31,30,30,30,29,29,30,31],
  1985: [31,31,31,32,31,31,29,30,30,29,30,30],
  1986: [31,31,32,31,31,31,30,29,30,29,30,30],
  1987: [31,32,31,32,31,30,30,29,30,29,30,30],
  1988: [31,32,31,32,31,30,30,30,29,29,30,31],
  1989: [31,31,31,32,31,31,29,30,30,29,30,30],
  1990: [31,31,32,31,31,31,30,29,30,29,30,30],
  1991: [31,32,31,32,31,30,30,30,29,29,30,30],
  1992: [31,32,31,32,31,30,30,30,29,30,29,31],
  1993: [31,31,32,31,31,31,30,29,30,29,30,30],
  1994: [31,31,32,31,31,31,30,29,30,29,30,30],
  1995: [31,32,31,32,31,30,30,30,29,29,30,30],
  1996: [31,32,31,32,31,30,30,30,29,30,29,31],
  1997: [31,31,32,31,31,31,30,29,30,29,30,30],
  1998: [31,31,32,31,31,31,30,29,30,29,30,30],
  1999: [31,32,31,32,31,30,30,30,29,29,30,31],
  2000: [30,32,31,32,31,30,30,30,29,30,29,31],
  2001: [31,31,32,31,31,31,30,29,30,29,30,30],
  2002: [31,31,32,32,31,30,30,29,30,29,30,30],
  2003: [31,32,31,32,31,30,30,30,29,29,30,31],
  2004: [30,32,31,32,31,30,30,30,29,30,29,31],
  2005: [31,31,32,31,31,31,30,29,30,29,30,30],
  2006: [31,31,32,32,31,30,30,29,30,29,30,30],
  2007: [31,32,31,32,31,30,30,30,29,29,30,31],
  2008: [31,31,31,32,31,31,29,30,30,29,29,31],
  2009: [31,31,32,31,31,31,30,29,30,29,30,30],
  2010: [31,31,32,32,31,30,30,29,30,29,30,30],
  2011: [31,32,31,32,31,30,30,30,29,29,30,31],
  2012: [31,31,31,32,31,31,29,30,30,29,30,30],
  2013: [31,31,32,31,31,31,30,29,30,29,30,30],
  2014: [31,31,32,32,31,30,30,29,30,29,30,30],
  2015: [31,32,31,32,31,30,30,30,29,29,30,31],
  2016: [31,31,31,32,31,31,29,30,30,29,30,30],
  2017: [31,31,32,31,31,31,30,29,30,29,30,30],
  2018: [31,32,31,32,31,30,30,29,30,29,30,30],
  2019: [31,32,31,32,31,30,30,30,29,30,29,31],
  2020: [31,31,31,32,31,31,30,29,30,29,30,30],
  2021: [31,31,32,31,31,31,30,29,30,29,30,30],
  2022: [31,32,31,32,31,30,30,30,29,29,30,30],
  2023: [31,32,31,32,31,30,30,30,29,30,29,31],
  2024: [31,31,31,32,31,31,30,29,30,29,30,30],
  2025: [31,31,32,31,31,31,30,29,30,29,30,30],
  2026: [31,32,31,32,31,30,30,30,29,29,30,31],
  2027: [30,32,31,32,31,30,30,30,29,30,29,31],
  2028: [31,31,32,31,31,31,30,29,30,29,30,30],
  2029: [31,31,32,31,32,30,30,29,30,29,30,30],
  2030: [31,32,31,32,31,30,30,30,29,29,30,31],
  2031: [30,32,31,32,31,30,30,30,29,30,29,31],
  2032: [31,31,32,31,31,31,30,29,30,29,30,30],
  2033: [31,31,32,32,31,30,30,29,30,29,30,30],
  2034: [31,32,31,32,31,30,30,30,29,29,30,31],
  2035: [30,32,31,32,31,31,29,30,30,29,29,31],
  2036: [31,31,32,31,31,31,30,29,30,29,30,30],
  2037: [31,31,32,32,31,30,30,29,30,29,30,30],
  2038: [31,32,31,32,31,30,30,30,29,29,30,31],
  2039: [31,31,31,32,31,31,29,30,30,29,30,30],
  2040: [31,31,32,31,31,31,30,29,30,29,30,30],
  2041: [31,31,32,32,31,30,30,29,30,29,30,30],
  2042: [31,32,31,32,31,30,30,30,29,29,30,31],
  2043: [31,31,31,32,31,31,29,30,30,29,30,30],
  2044: [31,31,32,31,31,31,30,29,30,29,30,30],
  2045: [31,32,31,32,31,30,30,29,30,29,30,30],
  2046: [31,32,31,32,31,30,30,30,29,29,30,31],
  2047: [31,31,31,32,31,31,30,29,30,29,30,30],
  2048: [31,31,32,31,31,31,30,29,30,29,30,30],
  2049: [31,32,31,32,31,30,30,30,29,29,30,30],
  2050: [31,32,31,32,31,30,30,30,29,30,29,31],
  2051: [31,31,31,32,31,31,30,29,30,29,30,30],
  2052: [31,31,32,31,31,31,30,29,30,29,30,30],
  2053: [31,32,31,32,31,30,30,30,29,29,30,30],
  2054: [31,32,31,32,31,30,30,30,29,30,29,31],
  2055: [31,31,32,31,31,31,30,29,30,29,30,30],
  2056: [31,31,32,31,32,30,30,29,30,29,30,30],
  2057: [31,32,31,32,31,30,30,30,29,29,30,31],
  2058: [30,32,31,32,31,30,30,30,29,30,29,31],
  2059: [31,31,32,31,31,31,30,29,30,29,30,30],
  2060: [31,31,32,32,31,30,30,29,30,29,30,30],
  2061: [31,32,31,32,31,30,30,30,29,29,30,31],
  2062: [31,31,31,32,31,31,29,30,29,30,29,31],
  2063: [31,31,32,31,31,31,30,29,30,29,30,30],
  2064: [31,31,32,32,31,30,30,29,30,29,30,30],
  2065: [31,32,31,32,31,30,30,30,29,29,30,31],
  2066: [31,31,31,32,31,31,29,30,30,29,29,31],
  2067: [31,31,32,31,31,31,30,29,30,29,30,30],
  2068: [31,31,32,32,31,30,30,29,30,29,30,30],
  2069: [31,32,31,32,31,30,30,30,29,29,30,31],
  2070: [31,31,31,32,31,31,29,30,30,29,30,30],
  2071: [31,31,32,31,31,31,30,29,30,29,30,30],
  2072: [31,32,31,32,31,30,30,29,30,29,30,30],
  2073: [31,32,31,32,31,30,30,30,29,29,30,31],
  2074: [31,31,31,32,31,31,30,29,30,29,30,30],
  2075: [31,31,32,31,31,31,30,29,30,29,30,30],
  2076: [31,32,31,32,31,30,30,30,29,29,30,30],
  2077: [31,32,31,32,31,30,30,30,29,30,29,31],
  2078: [31,31,31,32,31,31,30,29,30,29,30,30],
  2079: [31,31,32,31,31,31,30,29,30,29,30,30],
  2080: [31,32,31,32,31,30,30,30,29,29,30,30],
  2081: [31,32,31,32,31,30,30,30,29,30,29,31],
  2082: [31,31,32,31,31,31,30,29,30,29,30,30],
  2083: [31,31,32,31,31,31,30,29,30,29,30,30],
  2084: [31,31,32,31,31,30,30,30,29,30,30,30],
  2085: [31,32,31,32,30,31,30,30,29,30,30,30],
  2086: [30,32,31,32,31,30,30,30,29,30,30,30],
  2087: [31,31,32,31,31,31,30,29,30,30,30,30],
  2088: [30,31,32,32,30,31,30,30,29,30,30,30],
  2089: [30,32,31,32,31,30,30,30,29,30,30,30],
  2090: [30,32,31,32,31,30,30,30,29,30,30,30],
  2091: [31,31,32,31,31,31,30,30,29,30,30,30],
  2092: [30,31,32,32,31,30,30,30,29,30,30,30],
  2093: [30,32,31,32,31,30,30,30,29,30,30,30],
  2094: [31,31,32,31,31,30,30,30,29,30,30,30],
  2095: [31,31,32,31,31,31,30,29,30,30,30,30],
  2096: [30,31,32,32,31,30,30,29,30,29,30,30],
  2097: [31,32,31,32,31,30,30,30,29,30,30,30],
  2098: [31,31,32,31,31,31,29,30,29,30,29,31],
  2099: [31,31,32,31,31,31,30,29,29,30,30,30],
});

const DAY_MS = 86_400_000;
const ANCHOR_UTC_MS = Date.UTC(1913, 3, 13);

function assertInteger(value: number, label: string) {
  if (!Number.isInteger(value)) throw new TypeError(`${label} must be an integer`);
}

export function daysInBsMonth(year: number, month: number): number {
  assertInteger(year, "BS year");
  assertInteger(month, "BS month");
  if (year < BS_MIN_YEAR || year > BS_MAX_YEAR) {
    throw new RangeError(`BS year must be between ${BS_MIN_YEAR} and ${BS_MAX_YEAR}`);
  }
  if (month < 1 || month > 12) throw new RangeError("BS month must be between 1 and 12");
  return BS_MONTH_LENGTHS[year][month - 1];
}

export function isValidBsDate(value: BsDate): boolean {
  if (!Number.isInteger(value.year) || !Number.isInteger(value.month) || !Number.isInteger(value.day)) return false;
  if (value.year < BS_MIN_YEAR || value.year > BS_MAX_YEAR || value.month < 1 || value.month > 12) return false;
  return value.day >= 1 && value.day <= BS_MONTH_LENGTHS[value.year][value.month - 1];
}

export function assertValidBsDate(value: BsDate): void {
  if (!isValidBsDate(value)) {
    throw new RangeError(`Invalid BS date: ${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`);
  }
}

function daysBeforeBsYear(year: number): number {
  let total = 0;
  for (let y = BS_MIN_YEAR; y < year; y++) {
    total += BS_MONTH_LENGTHS[y].reduce((sum, days) => sum + days, 0);
  }
  return total;
}

function daysBeforeBsDate(value: BsDate): number {
  let total = daysBeforeBsYear(value.year);
  for (let month = 1; month < value.month; month++) {
    total += BS_MONTH_LENGTHS[value.year][month - 1];
  }
  return total + value.day - 1;
}

function isoFromUtcMs(ms: number): string {
  const d = new Date(ms);
  return [
    d.getUTCFullYear().toString().padStart(4, "0"),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function parseAdDate(value: string | Date): number {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new RangeError("Invalid AD date");
    return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new TypeError("AD date must use YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new RangeError("Invalid AD date");
  }
  return ms;
}

export function bsToAd(value: BsDate): string {
  assertValidBsDate(value);
  return isoFromUtcMs(ANCHOR_UTC_MS + daysBeforeBsDate(value) * DAY_MS);
}

const TOTAL_SUPPORTED_DAYS = (() => {
  let total = 0;
  for (let y = BS_MIN_YEAR; y <= BS_MAX_YEAR; y++) {
    total += BS_MONTH_LENGTHS[y].reduce((sum, days) => sum + days, 0);
  }
  return total;
})();

export const AD_MIN_DATE = BS_ANCHOR.ad;
export const AD_MAX_DATE = isoFromUtcMs(ANCHOR_UTC_MS + (TOTAL_SUPPORTED_DAYS - 1) * DAY_MS);

export function adToBs(value: string | Date): BsDate {
  const target = parseAdDate(value);
  const offset = Math.trunc((target - ANCHOR_UTC_MS) / DAY_MS);
  if (offset < 0 || offset >= TOTAL_SUPPORTED_DAYS) {
    throw new RangeError(`AD date must be between ${AD_MIN_DATE} and ${AD_MAX_DATE}`);
  }

  let remaining = offset;
  let year = BS_MIN_YEAR;

  while (year <= BS_MAX_YEAR) {
    const yearDays = BS_MONTH_LENGTHS[year].reduce((sum, days) => sum + days, 0);
    if (remaining < yearDays) break;
    remaining -= yearDays;
    year++;
  }

  let month = 1;
  while (month <= 12) {
    const monthDays = BS_MONTH_LENGTHS[year][month - 1];
    if (remaining < monthDays) break;
    remaining -= monthDays;
    month++;
  }

  return { year, month, day: remaining + 1 };
}

export function formatBsDate(value: BsDate): string {
  assertValidBsDate(value);
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

export function bsDateMetadata(value: BsDate): BsDateMetadata {
  assertValidBsDate(value);
  if (value.year <= BS_VALIDATED_THROUGH_YEAR) {
    return {
      confidence: "validated-project-archive",
      source: "Patro astronomy_calendar_map + cross-checked open month table",
      note: "Month lengths are validated against the existing synchronized Patro archive.",
    };
  }
  return {
    confidence: "provisional-open-table",
    source: "amitgaru/nepali-datetime calendar_bs.csv",
    note: "Future BS month tables can disagree across independent sources; verify against an official calendar before legal or deadline-critical use.",
  };
}
