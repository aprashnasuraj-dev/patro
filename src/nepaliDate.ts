// Nepali (AD) date formatting that works in every browser.
//
// Chrome — including Chrome on Android — ships without Nepali ICU data:
// `new Intl.DateTimeFormat("ne-NP")` silently resolves to "en-US" (or a bare
// root pattern such as "2026 M10 4, Sun"). So we only ask Intl for numeric
// parts in a guaranteed locale and supply the Nepali words and digits ourselves.

const DIGITS = "०१२३४५६७८९";
const MONTHS = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
const WEEKDAYS = ["आइतबार", "सोमबार", "मंगलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];
const WEEKDAYS_SHORT = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function neDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => DIGITS[Number(d)]);
}

/** Group like en-IN (1,23,456) and use Devanagari digits. */
export function neNumber(value: number, maximumFractionDigits = 0): string {
  return neDigits(new Intl.NumberFormat("en-IN", { maximumFractionDigits }).format(value));
}

export type NeDateOptions = {
  /** Include the weekday: "long" → आइतबार, "short" → आइत. */
  weekday?: "long" | "short";
  /** Include the year (default true). */
  year?: boolean;
  /** Include hh:mm (24-hour). */
  time?: boolean;
  /** IANA zone used to read the calendar date (default Asia/Kathmandu). */
  timeZone?: string;
  /** Append a zone label such as "UTC" after the time. */
  zoneLabel?: string;
};

function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(`${input}T06:00:00Z`);
  return new Date(input);
}

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year), month: Number(out.month), day: Number(out.day),
    weekday: WEEKDAY_INDEX[out.weekday] ?? date.getUTCDay(),
    hour: out.hour === "24" ? "00" : out.hour, minute: out.minute,
  };
}

/** e.g. "४ अक्टोबर २०२६, आइतबार" or "४ अक्टोबर २०२६, आइतबार १४:३०". Returns "" for invalid input. */
export function formatNeDate(input: Date | string | number, options: NeDateOptions = {}): string {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return typeof input === "string" ? input : "";
  const p = parts(date, options.timeZone || "Asia/Kathmandu");
  let text = `${neDigits(p.day)} ${MONTHS[p.month - 1]}`;
  if (options.year !== false) text += ` ${neDigits(p.year)}`;
  if (options.weekday) text += `, ${(options.weekday === "short" ? WEEKDAYS_SHORT : WEEKDAYS)[p.weekday]}`;
  if (options.time) text += ` ${neDigits(`${p.hour}:${p.minute}`)}${options.zoneLabel ? ` ${options.zoneLabel}` : ""}`;
  return text;
}

/** English counterpart (en-GB data is present in every browser). */
export function formatEnDate(input: Date | string | number, options: NeDateOptions = {}): string {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return typeof input === "string" ? input : "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: options.timeZone || "Asia/Kathmandu", day: "numeric", month: "long",
    ...(options.year !== false ? { year: "numeric" } : {}),
    ...(options.weekday ? { weekday: options.weekday } : {}),
    ...(options.time ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
  }).format(date) + (options.time && options.zoneLabel ? ` ${options.zoneLabel}` : "");
}

export function formatDate(input: Date | string | number, language: "ne" | "en", options: NeDateOptions = {}): string {
  return language === "en" ? formatEnDate(input, options) : formatNeDate(input, options);
}
