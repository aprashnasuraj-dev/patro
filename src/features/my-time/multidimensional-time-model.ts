/**
 * Derive the visual layers for My Time's Multidimensional explorer.
 *
 * This module is deliberately presentation-side and read-only: it reuses the
 * shared sunrise-anchored temporal rules and never redefines Panchang rules.
 * All interval comparisons are performed as instants (UTC epoch milliseconds).
 * Display coordinates are local wall-clock minutes for the selected civil day.
 */
import {
  choghadiyaWindows,
  horaWindows,
  inauspiciousDayWindows,
  type TemporalWindow,
} from "../../patro-tools/core/temporal-windows";
import {
  localDateTimeToUtc,
  type MyTimeSnapshot,
} from "../../patro-tools/core/my-time-snapshot";

export type ExplorerLanguage = "ne" | "en";

export type ExplorerLayerId =
  | "daylight"
  | "choghadiya"
  | "hora"
  | "caution"
  | "twilight";

export type ExplorerSegment = {
  id: string;
  layer: ExplorerLayerId;
  titleNe: string;
  titleEn: string;
  startUtc: string;
  endUtc: string;
  startMinute: number;
  endMinute: number;
  favorable?: boolean;
  tone?: "supportive" | "mixed" | "caution" | "neutral";
  source: "solar" | "traditional";
  explanationNe: string;
  explanationEn: string;
};

export type ExplorerMarker = {
  id: string;
  titleNe: string;
  titleEn: string;
  instantUtc: string;
  minute: number;
  kind: "sunrise" | "sunset" | "twilight";
  explanationNe: string;
  explanationEn: string;
};

export type ExplorerLayer = {
  id: ExplorerLayerId;
  titleNe: string;
  titleEn: string;
  shortNe: string;
  shortEn: string;
  descriptionNe: string;
  descriptionEn: string;
  segments: ExplorerSegment[];
  markers: ExplorerMarker[];
};

export type ExplorerBuildResult = {
  date: string;
  timezone: string;
  civilStartUtc: string;
  civilEndUtc: string;
  civilDurationMinutes: number;
  layers: ExplorerLayer[];
  solarAvailable: boolean;
  warnings: Array<{ id: string; ne: string; en: string }>;
  methodology: string[];
};

type RawSegment = {
  id: string;
  layer: ExplorerLayerId;
  titleNe: string;
  titleEn: string;
  startUtc: string;
  endUtc: string;
  favorable?: boolean;
  tone?: ExplorerSegment["tone"];
  source: ExplorerSegment["source"];
  explanationNe: string;
  explanationEn: string;
};

const LAYER_META: Record<ExplorerLayerId, Omit<ExplorerLayer, "segments" | "markers">> = {
  daylight: {
    id: "daylight",
    titleNe: "सौर प्रकाश",
    titleEn: "Solar light",
    shortNe: "सौर",
    shortEn: "Solar",
    descriptionNe: "स्थानीय सूर्योदय र सूर्यास्तबाट आएको खगोलीय समय सन्दर्भ।",
    descriptionEn: "Astronomical context anchored to local sunrise and sunset.",
  },
  choghadiya: {
    id: "choghadiya",
    titleNe: "चौघडिया",
    titleEn: "Choghadiya",
    shortNe: "चौघ",
    shortEn: "Chogh.",
    descriptionNe: "सूर्योदय–सूर्यास्त र सूर्यास्त–अर्को सूर्योदयलाई छुट्टाछुट्टै आठ भागमा बाँडिएको परम्परागत समय।",
    descriptionEn: "Traditional periods splitting daylight and night separately into eight parts.",
  },
  hora: {
    id: "hora",
    titleNe: "होरा",
    titleEn: "Planetary Hora",
    shortNe: "होरा",
    shortEn: "Hora",
    descriptionNe: "वारको स्वामी र ग्रहहरूको परम्परागत क्रमअनुसार दिन र रातका १२/१२ होरा।",
    descriptionEn: "Twelve daylight and twelve night hours based on the weekday lord and traditional planetary order.",
  },
  caution: {
    id: "caution",
    titleNe: "सावधानीका समय",
    titleEn: "Caution windows",
    shortNe: "काल",
    shortEn: "Caution",
    descriptionNe: "राहुकाल, यमगण्ड र गुलिक कालको परम्परागत समय सीमा।",
    descriptionEn: "Traditional boundaries for Rahu Kaal, Yamaganda and Gulika Kaal.",
  },
  twilight: {
    id: "twilight",
    titleNe: "सन्ध्याकाल",
    titleEn: "Twilight",
    shortNe: "सन्ध्या",
    shortEn: "Twilight",
    descriptionNe: "सूर्यको केन्द्र क्षितिजभन्दा −६°, −१२° र −१८° मा हुँदा गणना गरिएका सन्ध्या सङ्केत।",
    descriptionEn: "Twilight markers based on the Sun's center at −6°, −12° and −18° altitude.",
  },
};

const TWILIGHT_MARKERS = [
  { key: "astronomical_dawn_utc", id: "astronomical-dawn", kind: "twilight" as const, ne: "खगोलीय बिहानी", en: "Astronomical dawn", detailNe: "सूर्य −१८° उचाइमा पुग्ने बिहानीको सङ्केत।", detailEn: "Morning marker at −18° solar altitude." },
  { key: "nautical_dawn_utc", id: "nautical-dawn", kind: "twilight" as const, ne: "नौचालन बिहानी", en: "Nautical dawn", detailNe: "सूर्य −१२° उचाइमा पुग्ने बिहानीको सङ्केत।", detailEn: "Morning marker at −12° solar altitude." },
  { key: "civil_dawn_utc", id: "civil-dawn", kind: "twilight" as const, ne: "नागरिक बिहानी", en: "Civil dawn", detailNe: "सूर्य −६° उचाइमा पुग्ने बिहानीको सङ्केत।", detailEn: "Morning marker at −6° solar altitude." },
  { key: "civil_dusk_utc", id: "civil-dusk", kind: "twilight" as const, ne: "नागरिक साँझ", en: "Civil dusk", detailNe: "सूर्य −६° उचाइमा पुग्ने साँझको सङ्केत।", detailEn: "Evening marker at −6° solar altitude." },
  { key: "nautical_dusk_utc", id: "nautical-dusk", kind: "twilight" as const, ne: "नौचालन साँझ", en: "Nautical dusk", detailNe: "सूर्य −१२° उचाइमा पुग्ने साँझको सङ्केत।", detailEn: "Evening marker at −12° solar altitude." },
  { key: "astronomical_dusk_utc", id: "astronomical-dusk", kind: "twilight" as const, ne: "खगोलीय साँझ", en: "Astronomical dusk", detailNe: "सूर्य −१८° उचाइमा पुग्ने साँझको सङ्केत।", detailEn: "Evening marker at −18° solar altitude." },
];

function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return [
    String(value.getUTCFullYear()).padStart(4, "0"),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isValidInstant(value: string | null | undefined): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function safeLocalMinute(instant: Date, timezone: string): number | null {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(instant)
        .map((part) => [part.type, part.value]),
    );
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    const second = Number(parts.second);
    if (![hour, minute, second].every(Number.isFinite)) return null;
    return hour * 60 + minute + second / 60;
  } catch {
    return null;
  }
}

function localDateParts(instant: Date, timezone: string): string | null {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(instant)
        .map((part) => [part.type, part.value]),
    );
    return String(parts.year) + "-" + String(parts.month) + "-" + String(parts.day);
  } catch {
    return null;
  }
}

/**
 * Converts a UTC instant into a minute coordinate on the selected local day's
 * 00:00–24:00 wall-clock axis. The end boundary is represented as 1440 rather
 * than zero, which keeps an interval ending at midnight visually unambiguous.
 */
function axisMinute(
  instant: Date,
  timezone: string,
  selectedDate: string,
  civilEndMs: number,
): number | null {
  if (instant.getTime() === civilEndMs) return 1440;
  if (localDateParts(instant, timezone) !== selectedDate) return null;
  return safeLocalMinute(instant, timezone);
}

function clipRawSegment(
  raw: RawSegment,
  timezone: string,
  selectedDate: string,
  civilStartMs: number,
  civilEndMs: number,
): ExplorerSegment | null {
  if (!isValidInstant(raw.startUtc) || !isValidInstant(raw.endUtc)) return null;
  const rawStart = Date.parse(raw.startUtc);
  const rawEnd = Date.parse(raw.endUtc);
  if (rawEnd <= rawStart) return null;
  const start = Math.max(rawStart, civilStartMs);
  const end = Math.min(rawEnd, civilEndMs);
  if (end <= start) return null;
  const startMinute = axisMinute(new Date(start), timezone, selectedDate, civilEndMs);
  const endMinute = axisMinute(new Date(end), timezone, selectedDate, civilEndMs);
  if (startMinute == null || endMinute == null || endMinute <= startMinute) return null;
  return {
    id: raw.id,
    layer: raw.layer,
    titleNe: raw.titleNe,
    titleEn: raw.titleEn,
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(end).toISOString(),
    startMinute,
    endMinute,
    favorable: raw.favorable,
    tone: raw.tone,
    source: raw.source,
    explanationNe: raw.explanationNe,
    explanationEn: raw.explanationEn,
  };
}

function clipRawMarker(
  raw: ExplorerMarker,
  timezone: string,
  selectedDate: string,
  civilStartMs: number,
  civilEndMs: number,
): ExplorerMarker | null {
  if (!isValidInstant(raw.instantUtc)) return null;
  const time = Date.parse(raw.instantUtc);
  if (time < civilStartMs || time >= civilEndMs) return null;
  const minute = axisMinute(new Date(time), timezone, selectedDate, civilEndMs);
  if (minute == null) return null;
  return { ...raw, minute };
}

function asRawTraditional(
  layer: "choghadiya" | "hora" | "caution",
  value: TemporalWindow & { eighth?: number },
): RawSegment {
  const isChoghadiya = layer === "choghadiya";
  const isHora = layer === "hora";
  const favorable = value.favorable;
  const explainNe = isChoghadiya
    ? (favorable ? "यस परम्परागत चौघडियालाई अनुकूल मानिन्छ।" : "यस चौघडियाको परम्परागत अर्थ रोजिएको अभ्यासअनुसार फरक हुन सक्छ।")
    : isHora
      ? "होरा समय सूर्योदय/सूर्यास्तमा आधारित दिन–रातको विभाजनबाट आएको हो।"
      : "यो समय परम्परागत सावधानी खण्ड हो; यसले नियमित काम रोक्नुपर्ने वैज्ञानिक निष्कर्ष जनाउँदैन।";
  const explainEn = isChoghadiya
    ? (favorable ? "This Choghadiya is traditionally treated as favorable." : "The traditional interpretation of this Choghadiya depends on the practice followed.")
    : isHora
      ? "The Hora period comes from day/night divisions anchored to sunrise and sunset."
      : "This is a traditional caution window, not a scientific finding that routine work must stop.";
  return {
    id: layer + "-" + value.key,
    layer,
    titleNe: value.name_ne,
    titleEn: value.name_en,
    startUtc: value.start_utc,
    endUtc: value.end_utc,
    favorable,
    source: "traditional",
    explanationNe: explainNe,
    explanationEn: explainEn,
  };
}

function pushSegment(
  layers: Map<ExplorerLayerId, ExplorerSegment[]>,
  raw: RawSegment,
  timezone: string,
  selectedDate: string,
  startMs: number,
  endMs: number,
): void {
  const segment = clipRawSegment(raw, timezone, selectedDate, startMs, endMs);
  if (!segment) return;
  layers.get(raw.layer)?.push(segment);
}

function emptyLayerSegments(): Map<ExplorerLayerId, ExplorerSegment[]> {
  return new Map<ExplorerLayerId, ExplorerSegment[]>([
    ["daylight", []],
    ["choghadiya", []],
    ["hora", []],
    ["caution", []],
    ["twilight", []],
  ]);
}

export function buildMultidimensionalLayers(
  snapshot: MyTimeSnapshot,
  timezone: string,
): ExplorerBuildResult {
  const date = snapshot.date;
  const selectedTimezone = timezone || snapshot.timezone || "UTC";
  const civilStart = localDateTimeToUtc(date, selectedTimezone, 0);
  const civilEnd = localDateTimeToUtc(addIsoDays(date, 1), selectedTimezone, 0);
  const startMs = civilStart.getTime();
  const endMs = civilEnd.getTime();
  const layerSegments = emptyLayerSegments();
  const warnings: ExplorerBuildResult["warnings"] = [];
  const solar = snapshot.panchang;
  const solarAvailable = isValidInstant(solar.sunrise_utc) &&
    isValidInstant(solar.sunset_utc) &&
    isValidInstant(solar.next_sunrise_utc);

  if (solarAvailable) {
    pushSegment(layerSegments, {
      id: "daylight-day",
      layer: "daylight",
      titleNe: "स्थानीय दिनको प्रकाश",
      titleEn: "Local daylight",
      startUtc: solar.sunrise_utc!,
      endUtc: solar.sunset_utc!,
      source: "solar",
      tone: "neutral",
      explanationNe: "स्थानीय स्थानका लागि गणना गरिएको सूर्योदयदेखि सूर्यास्तसम्मको अवधि।",
      explanationEn: "The interval from calculated local sunrise to local sunset.",
    }, selectedTimezone, date, startMs, endMs);
    pushSegment(layerSegments, {
      id: "daylight-night",
      layer: "daylight",
      titleNe: "स्थानीय रात",
      titleEn: "Local night",
      startUtc: solar.sunset_utc!,
      endUtc: solar.next_sunrise_utc!,
      source: "solar",
      tone: "neutral",
      explanationNe: "स्थानीय सूर्यास्तदेखि अर्को सूर्योदयसम्मको अवधि।",
      explanationEn: "The interval from local sunset to the next sunrise.",
    }, selectedTimezone, date, startMs, endMs);

    const choghadiya = choghadiyaWindows(
      snapshot.weekday,
      solar.sunrise_utc,
      solar.sunset_utc,
      solar.next_sunrise_utc,
    );
    [...choghadiya.day, ...choghadiya.night].forEach((period) =>
      pushSegment(layerSegments, asRawTraditional("choghadiya", period), selectedTimezone, date, startMs, endMs),
    );

    const hora = horaWindows(
      snapshot.weekday,
      solar.sunrise_utc,
      solar.sunset_utc,
      solar.next_sunrise_utc,
    );
    [...hora.day, ...hora.night].forEach((period) =>
      pushSegment(layerSegments, asRawTraditional("hora", period), selectedTimezone, date, startMs, endMs),
    );

    inauspiciousDayWindows(snapshot.weekday, solar.sunrise_utc, solar.sunset_utc).forEach((period) => {
      const titleNe = period.name_ne;
      const titleEn = period.name_en;
      pushSegment(layerSegments, {
        ...asRawTraditional("caution", period),
        titleNe,
        titleEn,
        explanationNe: "परम्परागत रूपमा नयाँ शुभकार्यको समय छान्दा ध्यानमा राखिने खण्ड।",
        explanationEn: "A traditionally observed window when choosing the start time of auspicious activities.",
      }, selectedTimezone, date, startMs, endMs);
    });
  } else {
    warnings.push({
      id: "solar-unavailable",
      ne: "सूर्योदय/सूर्यास्त उपलब्ध नभएकाले सौर-आधारित तहहरू बनाइएनन्।",
      en: "Solar-based layers are omitted because sunrise/sunset is unavailable.",
    });
  }


  const markerRaw: ExplorerMarker[] = [];
  if (isValidInstant(solar.sunrise_utc)) {
    markerRaw.push({
      id: "sunrise",
      titleNe: "सूर्योदय",
      titleEn: "Sunrise",
      instantUtc: solar.sunrise_utc,
      minute: 0,
      kind: "sunrise",
      explanationNe: "यस स्थान र मितिका लागि प्रदायकले दिएको सूर्योदय।",
      explanationEn: "Provider-calculated sunrise for this place and date.",
    });
  }
  if (isValidInstant(solar.sunset_utc)) {
    markerRaw.push({
      id: "sunset",
      titleNe: "सूर्यास्त",
      titleEn: "Sunset",
      instantUtc: solar.sunset_utc,
      minute: 0,
      kind: "sunset",
      explanationNe: "यस स्थान र मितिका लागि प्रदायकले दिएको सूर्यास्त।",
      explanationEn: "Provider-calculated sunset for this place and date.",
    });
  }

  TWILIGHT_MARKERS.forEach((entry) => {
    const value = snapshot.twilight[entry.key as keyof MyTimeSnapshot["twilight"]];
    if (!isValidInstant(value)) return;
    markerRaw.push({
      id: entry.id,
      titleNe: entry.ne,
      titleEn: entry.en,
      instantUtc: value,
      minute: 0,
      kind: "twilight",
      explanationNe: entry.detailNe,
      explanationEn: entry.detailEn,
    });
  });

  const layerMarkers = new Map<ExplorerLayerId, ExplorerMarker[]>(
    [["daylight", []], ["choghadiya", []], ["hora", []], ["caution", []], ["twilight", []], ["personal", []]],
  );
  markerRaw.forEach((marker) => {
    const clipped = clipRawMarker(marker, selectedTimezone, date, startMs, endMs);
    if (clipped) layerMarkers.get(marker.kind === "twilight" ? "twilight" : "daylight")?.push(clipped);
  });

  const layers = (Object.keys(LAYER_META) as ExplorerLayerId[]).map((id) => ({
    ...LAYER_META[id],
    segments: (layerSegments.get(id) || []).sort((a, b) => a.startMinute - b.startMinute),
    markers: (layerMarkers.get(id) || []).sort((a, b) => a.minute - b.minute),
  }));

  return {
    date,
    timezone: selectedTimezone,
    civilStartUtc: civilStart.toISOString(),
    civilEndUtc: civilEnd.toISOString(),
    civilDurationMinutes: (endMs - startMs) / 60000,
    layers,
    solarAvailable,
    warnings,
    methodology: [
      "Intervals are represented as half-open UTC intervals [start, end).",
      "The visual axis is local wall-clock time, even when the selected civil day is not exactly 24 elapsed hours because of a time-zone transition.",
      "Solar-based periods are only generated when sunrise, sunset and next sunrise are all available.",
    ],
  };
}

export function findActiveSegment(
  segments: ExplorerSegment[],
  instant: Date,
): ExplorerSegment | null {
  const time = instant.getTime();
  return segments.find((segment) =>
    time >= Date.parse(segment.startUtc) && time < Date.parse(segment.endUtc),
  ) || null;
}

export function findNextLayerTransition(
  layers: ExplorerLayer[],
  instant: Date,
): { instant: Date; layer: ExplorerLayer; segment: ExplorerSegment } | null {
  const time = instant.getTime();
  const candidates = layers.flatMap((layer) =>
    layer.segments.flatMap((segment) => {
      const start = Date.parse(segment.startUtc);
      const end = Date.parse(segment.endUtc);
      const next = start > time ? start : end > time ? end : Number.POSITIVE_INFINITY;
      if (!Number.isFinite(next)) return [];
      return [{ time: next, layer, segment }];
    }),
  ).sort((a, b) => a.time - b.time);
  const next = candidates[0];
  return next ? { instant: new Date(next.time), layer: next.layer, segment: next.segment } : null;
}

export function formatLocalClock(
  instant: Date | string,
  timezone: string,
  language: ExplorerLanguage,
  withSeconds = false,
): string {
  const value = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(value.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds ? { second: "2-digit" } : {}),
      hourCycle: "h23",
    }).format(value);
  } catch {
    return "—";
  }
}

export function formatLocalDate(
  instant: Date | string,
  timezone: string,
  language: ExplorerLanguage,
): string {
  const value = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(value.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(language === "ne" ? "ne-NP" : "en-GB", {
      timeZone: timezone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(value);
  } catch {
    return "—";
  }
}

export function formatDuration(startUtc: string, endUtc: string): string {
  const minutes = Math.max(0, Math.round((Date.parse(endUtc) - Date.parse(startUtc)) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return hours + "h " + remainder + "m";
  if (hours) return hours + "h";
  return minutes + "m";
}

export function localMinuteForDate(instant: Date, timezone: string): number {
  return safeLocalMinute(instant, timezone) ?? 0;
}

export function instantForLocalMinute(date: string, minute: number, timezone: string): Date {
  const normalizedMinute = Math.min(1439, Math.max(0, Math.round(minute)));
  const hour = Math.floor(normalizedMinute / 60);
  const minutePart = normalizedMinute % 60;
  const hourTarget = localDateTimeToUtc(date, timezone, hour);
  const result = new Date(hourTarget.getTime() + minutePart * 60000);
  const check = localDateParts(result, timezone);
  if (check !== date) return hourTarget;
  return result;
}

export function percentForMinute(minute: number): number {
  return Math.min(100, Math.max(0, (minute / 1440) * 100));
}

export function angleForMinute(minute: number): number {
  return (minute / 1440) * Math.PI * 2 - Math.PI / 2;
}

export function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  minute: number,
): { x: number; y: number } {
  const angle = angleForMinute(minute);
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

export function svgArcPath(
  cx: number,
  cy: number,
  radius: number,
  startMinute: number,
  endMinute: number,
): string {
  const start = polarPoint(cx, cy, radius, startMinute);
  const end = polarPoint(cx, cy, radius, endMinute);
  const span = endMinute - startMinute;
  if (span <= 0) return "";
  if (span >= 1439.999) {
    return [
      "M", cx, cy - radius,
      "A", radius, radius, 0, 1, 1, cx, cy + radius,
      "A", radius, radius, 0, 1, 1, cx, cy - radius,
    ].join(" ");
  }
  return [
    "M", start.x.toFixed(3), start.y.toFixed(3),
    "A", radius, radius, 0, span > 720 ? 1 : 0, 1,
    end.x.toFixed(3), end.y.toFixed(3),
  ].join(" ");
}

