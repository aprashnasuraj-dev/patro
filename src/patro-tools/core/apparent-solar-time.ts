export type ApparentSolarTime = {
  time: string;
  minutesSinceMidnight: number;
  equationOfTimeMinutes: number;
  longitudeCorrectionMinutes: number;
  approximation: "NOAA fractional-year equation";
};

/** Approximate apparent solar time using longitude and the NOAA equation-of-time series. */
export function apparentSolarTime(instant: Date, longitude: number): ApparentSolarTime {
  if (!Number.isFinite(instant.getTime())) throw new Error("invalid_instant");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("invalid_longitude");
  const year = instant.getUTCFullYear();
  const dayStart = Date.UTC(year, 0, 1);
  const dayOfYear = Math.floor((Date.UTC(year, instant.getUTCMonth(), instant.getUTCDate()) - dayStart) / 86_400_000) + 1;
  const utcMinutes = instant.getUTCHours() * 60 + instant.getUTCMinutes() + instant.getUTCSeconds() / 60 + instant.getUTCMilliseconds() / 60_000;
  const longitudeCorrectionMinutes = longitude * 4;
  const localMeanMinutes = utcMinutes + longitudeCorrectionMinutes;
  const localMeanHour = ((localMeanMinutes % 1440) + 1440) % 1440 / 60;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (localMeanHour - 12) / 24);
  const equationOfTimeMinutes = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
  const minutesSinceMidnight = ((utcMinutes + longitudeCorrectionMinutes + equationOfTimeMinutes) % 1440 + 1440) % 1440;
  const wholeSeconds = Math.floor(minutesSinceMidnight * 60 + 0.5) % 86_400;
  const hour = Math.floor(wholeSeconds / 3600);
  const minute = Math.floor((wholeSeconds % 3600) / 60);
  const second = wholeSeconds % 60;
  return {
    time: [hour, minute, second].map(value => String(value).padStart(2, "0")).join(":"),
    minutesSinceMidnight,
    equationOfTimeMinutes,
    longitudeCorrectionMinutes,
    approximation: "NOAA fractional-year equation"
  };
}
