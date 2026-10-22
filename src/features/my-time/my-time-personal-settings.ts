/** Local view preferences only. Legacy alert/event payloads are intentionally discarded on read. */
export type MyTimeLens = "universal" | "scientific" | "panchang" | "jyotish" | "tantra" | "combined";
export type MyTimeInterest = "general" | "work" | "study" | "travel" | "prayer" | "meditation" | "family";
export type MyTimePersonalSettings = { setupComplete: boolean; lens: MyTimeLens; interests: MyTimeInterest[] };
export const MY_TIME_PERSONAL_KEY = "aafnaipatro.mytime.personal.v1";
export const RETIRED_MY_TIME_EVENTS_BACKUP_KEY = "aafnaipatro.mytime.retired-events.v1";
export const DEFAULT_MY_TIME_PERSONAL_SETTINGS: MyTimePersonalSettings = { setupComplete: false, lens: "universal", interests: ["general"] };
const lenses = new Set<MyTimeLens>(["universal", "scientific", "panchang", "jyotish", "tantra", "combined"]);
const interests = new Set<MyTimeInterest>(["general", "work", "study", "travel", "prayer", "meditation", "family"]);
export function normalizeMyTimePersonalSettings(value: unknown): MyTimePersonalSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_MY_TIME_PERSONAL_SETTINGS, interests: ["general"] };
  const raw = value as Partial<MyTimePersonalSettings>;
  const selected = Array.isArray(raw.interests) ? raw.interests.filter((item): item is MyTimeInterest => typeof item === "string" && interests.has(item as MyTimeInterest)) : [];
  return { setupComplete: raw.setupComplete === true, lens: typeof raw.lens === "string" && lenses.has(raw.lens as MyTimeLens) ? raw.lens as MyTimeLens : "universal", interests: [...new Set<MyTimeInterest>(selected.length ? selected : ["general"])] };
}
export function readMyTimePersonalSettings(storage?: Pick<Storage, "getItem">): MyTimePersonalSettings {
  try { const source = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage); return normalizeMyTimePersonalSettings(source ? JSON.parse(source.getItem(MY_TIME_PERSONAL_KEY) || "null") : null); }
  catch { return normalizeMyTimePersonalSettings(null); }
}
export function saveMyTimePersonalSettings(settings: MyTimePersonalSettings, storage?: Pick<Storage, "setItem">): void {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    if (!target) return;
    // Preserve legacy events before dropping the defunct alert UI.
    const readable = target as Partial<Storage>;
    if (typeof readable.getItem === "function") {
      const previous = JSON.parse(readable.getItem(MY_TIME_PERSONAL_KEY) || "null");
      if (previous && Array.isArray(previous.savedEvents) && previous.savedEvents.length &&
          !readable.getItem(RETIRED_MY_TIME_EVENTS_BACKUP_KEY)) {
        target.setItem(RETIRED_MY_TIME_EVENTS_BACKUP_KEY, JSON.stringify(previous.savedEvents));
      }
    }
    target.setItem(MY_TIME_PERSONAL_KEY, JSON.stringify(normalizeMyTimePersonalSettings(settings)));
  }
  catch { /* Optional local preferences must not block the page. */ }
}
