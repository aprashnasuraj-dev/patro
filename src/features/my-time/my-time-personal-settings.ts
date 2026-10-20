export type MyTimeLens = "universal" | "scientific" | "panchang" | "jyotish" | "tantra" | "combined";
export type MyTimeInterest = "general" | "work" | "study" | "travel" | "prayer" | "meditation" | "family";
export type MyTimeSavedEvent = { id: string; title: string; at: string; notifiedAt?: string };
export type MyTimePersonalSettings = {
  setupComplete: boolean;
  lens: MyTimeLens;
  interests: MyTimeInterest[];
  notifications: {
    tithiTransitions: boolean;
    nakshatraTransitions: boolean;
    timingWindows: boolean;
    savedEvents: boolean;
    quietStart: string;
    quietEnd: string;
    frequency: "important" | "all";
  };
  savedEvents: MyTimeSavedEvent[];
};
export const MY_TIME_PERSONAL_KEY = "aafnaipatro.mytime.personal.v1";
export const DEFAULT_MY_TIME_PERSONAL_SETTINGS: MyTimePersonalSettings = {
  setupComplete: false,
  lens: "universal",
  interests: ["general"],
  notifications: {
    tithiTransitions: false, nakshatraTransitions: false, timingWindows: false, savedEvents: false,
    quietStart: "22:00", quietEnd: "07:00", frequency: "important"
  },
  savedEvents: []
};
const lenses = new Set<MyTimeLens>(["universal", "scientific", "panchang", "jyotish", "tantra", "combined"]);
const interests = new Set<MyTimeInterest>(["general", "work", "study", "travel", "prayer", "meditation", "family"]);
function validClock(value: unknown, fallback: string) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}
export function normalizeMyTimePersonalSettings(value: unknown): MyTimePersonalSettings {
  if (!value || typeof value !== "object") return structuredClone(DEFAULT_MY_TIME_PERSONAL_SETTINGS);
  const raw = value as Partial<MyTimePersonalSettings>;
  const n = raw.notifications && typeof raw.notifications === "object" ? raw.notifications : DEFAULT_MY_TIME_PERSONAL_SETTINGS.notifications;
  const selected: MyTimeInterest[] = Array.isArray(raw.interests) ? raw.interests.filter((item): item is MyTimeInterest => typeof item === "string" && interests.has(item as MyTimeInterest)) : ["general"];
  const savedEvents = Array.isArray(raw.savedEvents) ? raw.savedEvents.filter((item): item is MyTimeSavedEvent =>
    !!item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string" &&
    item.title.trim().length > 0 && item.title.length <= 100 && typeof item.at === "string" && Number.isFinite(Date.parse(item.at))
  ).slice(-50).map(item => ({ id: item.id, title: item.title.trim(), at: new Date(item.at).toISOString(), ...(typeof item.notifiedAt === "string" ? { notifiedAt: item.notifiedAt } : {}) })) : [];
  return {
    setupComplete: raw.setupComplete === true,
    lens: typeof raw.lens === "string" && lenses.has(raw.lens as MyTimeLens) ? raw.lens as MyTimeLens : "universal",
    interests: [...new Set<MyTimeInterest>(selected.length ? selected : ["general"])],
    notifications: {
      tithiTransitions: n.tithiTransitions === true, nakshatraTransitions: n.nakshatraTransitions === true,
      timingWindows: n.timingWindows === true, savedEvents: n.savedEvents === true,
      quietStart: validClock(n.quietStart, "22:00"), quietEnd: validClock(n.quietEnd, "07:00"),
      frequency: n.frequency === "all" ? "all" : "important"
    },
    savedEvents
  };
}
export function readMyTimePersonalSettings(storage?: Pick<Storage, "getItem">): MyTimePersonalSettings {
  try {
    const source = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    if (!source) return structuredClone(DEFAULT_MY_TIME_PERSONAL_SETTINGS);
    return normalizeMyTimePersonalSettings(JSON.parse(source.getItem(MY_TIME_PERSONAL_KEY) || "null"));
  } catch { return structuredClone(DEFAULT_MY_TIME_PERSONAL_SETTINGS); }
}
export function saveMyTimePersonalSettings(settings: MyTimePersonalSettings, storage?: Pick<Storage, "setItem">): void {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    target?.setItem(MY_TIME_PERSONAL_KEY, JSON.stringify(normalizeMyTimePersonalSettings(settings)));
  } catch { /* Preferences are optional; storage denial must not block the universal view. */ }
}
export function isWithinQuietHours(now: Date, timezone: string, start: string, end: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const minute = Number(values.hour) * 60 + Number(values.minute);
    const parse = (clock: string) => { const [h, m] = clock.split(":").map(Number); return h * 60 + m; };
    const a = parse(start), b = parse(end);
    return a === b ? false : a < b ? minute >= a && minute < b : minute >= a || minute < b;
  } catch { return false; }
}
