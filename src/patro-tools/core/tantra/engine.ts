import { NITYA_DEVIS, PANCHA_TATWAS, YOGINI_POSITIONS } from "./constants";

export interface TantraTimeResult {
  nityaDevi: typeof NITYA_DEVIS[number];
  paksha: "Shukla" | "Krishna";
  activeTatwa: typeof PANCHA_TATWAS[number];
  tatwaElapsedMinutes: number;
  tatwaRemainingMinutes: number;
  tatwaWindow: { start: string; end: string };
  yoginiDirection: string;
  mahanishaKaal: { start: string; end: string; isActive: boolean };
}

/**
 * Rule-based traditional chronometry, not a scientific measurement of subtle energy.
 * The Tatwa wave is modelled as five repeating 24-minute segments anchored to sunrise.
 * Mahanisha is approximated by the midpoint between sunset and the following sunrise.
 */
export function computeTantraTime(
  tithiNumber: number,
  currentDate: Date,
  sunrise: Date,
  sunset: Date,
  nextSunrise: Date
): TantraTimeResult {
  if (!Number.isInteger(tithiNumber) || tithiNumber < 1 || tithiNumber > 30) throw new Error("invalid_tithi");
  for (const [name, value] of [["currentDate", currentDate], ["sunrise", sunrise], ["sunset", sunset], ["nextSunrise", nextSunrise]] as const) {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error("invalid_" + name);
  }
  if (sunset.getTime() <= sunrise.getTime() || nextSunrise.getTime() <= sunset.getTime()) throw new Error("invalid_solar_window");

  const isShukla = tithiNumber <= 15;
  const paksha = isShukla ? "Shukla" : "Krishna";
  const nityaIndex = isShukla ? tithiNumber : 31 - tithiNumber;
  const nityaDevi = NITYA_DEVIS[nityaIndex - 1];
  const elapsedMinutes = Math.floor((currentDate.getTime() - sunrise.getTime()) / 60_000);
  const normalizedMinutes = ((elapsedMinutes % 120) + 120) % 120;
  const tatwaIndex = Math.floor(normalizedMinutes / 24);
  const activeTatwa = PANCHA_TATWAS[tatwaIndex];
  const tatwaElapsedMinutes = normalizedMinutes % 24;
  const tatwaRemainingMinutes = 24 - tatwaElapsedMinutes;
  const tatwaStart = new Date(currentDate.getTime() - tatwaElapsedMinutes * 60_000);
  const tatwaEnd = new Date(tatwaStart.getTime() + 24 * 60_000);

  const solarMidnightMs = sunset.getTime() + (nextSunrise.getTime() - sunset.getTime()) / 2;
  const mahanishaStart = new Date(solarMidnightMs - 24 * 60_000);
  const mahanishaEnd = new Date(solarMidnightMs + 24 * 60_000);
  const nowMs = currentDate.getTime();

  return {
    nityaDevi,
    paksha,
    activeTatwa,
    tatwaElapsedMinutes,
    tatwaRemainingMinutes,
    tatwaWindow: { start: tatwaStart.toISOString(), end: tatwaEnd.toISOString() },
    yoginiDirection: YOGINI_POSITIONS[nityaIndex] || "Center",
    mahanishaKaal: {
      start: mahanishaStart.toISOString(),
      end: mahanishaEnd.toISOString(),
      isActive: nowMs >= mahanishaStart.getTime() && nowMs < mahanishaEnd.getTime()
    }
  };
}
