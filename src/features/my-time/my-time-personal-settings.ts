/** Local view preferences only. Legacy alert/event payloads are intentionally discarded on read. */
export type MyTimeLens = "universal" | "scientific" | "panchang" | "jyotish" | "tantra" | "combined";
export type MyTimeInterest = "general" | "work" | "study" | "travel" | "prayer" | "meditation" | "family";
export type MyTimePersonalSettings = { setupComplete: boolean; lens: MyTimeLens; interests: MyTimeInterest[] };
export const MY_TIME_PERSONAL_KEY = "aafnaipatro.mytime.personal.v1";
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
  try { const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage); target?.setItem(MY_TIME_PERSONAL_KEY, JSON.stringify(normalizeMyTimePersonalSettings(settings))); }
  catch { /* Optional local preferences must not block the page. */ }
}
