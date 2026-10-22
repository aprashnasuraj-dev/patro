/** Deterministic UTC segmentation of a candidate period at changing constraint boundaries.
 * A one-minute unfavorable overlap must not contaminate a whole longer window.
 * No wall-clock arithmetic: DST and half-hour offsets are handled by UTC instants.
 */
export type UtcWindow = { start_utc: string; end_utc: string };
export function splitTimingWindowAtBoundaries<T extends UtcWindow>(window: T, changes: readonly UtcWindow[]): Array<T & { start_utc: string; end_utc: string }> {
  const start = Date.parse(window.start_utc), end = Date.parse(window.end_utc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const boundaries = new Set([start,end]);
  for (const change of changes) {
    const a=Date.parse(change.start_utc), b=Date.parse(change.end_utc);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b<=a) continue;
    if (a>start && a<end) boundaries.add(a);
    if (b>start && b<end) boundaries.add(b);
  }
  const sorted=[...boundaries].sort((a,b)=>a-b);
  return sorted.slice(0,-1).filter((x,i)=>sorted[i+1]>x).map((x,i)=>({
    ...window,start_utc:new Date(x).toISOString(),end_utc:new Date(sorted[i+1]).toISOString()
  }));
}
