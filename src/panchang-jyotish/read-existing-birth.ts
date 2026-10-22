import { findJanmaPatroBirthTimezone, JANMAPATRO_CONTEXT_STORAGE_KEY, readJanmaPatroBirthInput } from "../jyotish/my-time-bridge";
import type { BirthInput } from "../jyotish/jyotishEngine";

/**
 * Read the existing JanmaPatro context without writing, renaming or migrating it.
 * The helper exported by the current bridge validates date/time/coordinates but
 * intentionally returns only editable form fields, so recover an explicitly saved
 * IANA timezone from the same existing context instead of guessing from a city name.
 */
export function readExistingJanmaPatroBirth(): BirthInput | null {
  const validated = readJanmaPatroBirthInput();
  if (!validated) return null;
  let savedTimezone: string | undefined;
  try {
    const raw = JSON.parse(localStorage.getItem(JANMAPATRO_CONTEXT_STORAGE_KEY) || "null");
    const candidate = raw?.birth?.timezone;
    if (typeof candidate === "string" && candidate.trim()) {
      new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
      savedTimezone = candidate;
    }
  } catch { /* Continue using the existing bridge's documented location/legacy fallback. */ }
  return {
    ...validated,
    timezone: savedTimezone ?? findJanmaPatroBirthTimezone(validated.location) ?? "Asia/Kathmandu"
  };
}
