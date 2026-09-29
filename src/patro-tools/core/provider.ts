/**
 * The single entry point every tool uses for panchang data.
 *
 * Wiring your existing engine:
 *
 *   import { createPanchangProvider } from '@/patro-tools/core/provider';
 *   export const panchang = createPanchangProvider({
 *     // Optional: return your engine's value for a day; return undefined to
 *     // fall back to the astronomy engine (e.g. diaspora location, far years).
 *     primary: (date, loc) => myEngine.hasDay(date, loc) ? myEngine.toDayPanchang(date, loc) : undefined,
 *   });
 */
import { dayPanchang, panchangAt } from './astro';
import { KATHMANDU } from './types';
import type { DayPanchang, GeoLocation, MonthSystem, PanchangAt } from './types';

export interface PanchangProvider {
  day(date: string, loc?: GeoLocation): DayPanchang;
  at(instant: Date): PanchangAt;
  readonly system: MonthSystem;
  readonly defaultLocation: GeoLocation;
}

export interface ProviderOptions {
  primary?: (date: string, loc: GeoLocation) => DayPanchang | undefined;
  system?: MonthSystem;
  defaultLocation?: GeoLocation;
  /** LRU size for computed days (each day ≈ 1 ms to compute) */
  cacheSize?: number;
}

export function createPanchangProvider(opts: ProviderOptions = {}): PanchangProvider {
  const system = opts.system ?? 'purnimanta';
  const defaultLocation = opts.defaultLocation ?? KATHMANDU;
  const max = opts.cacheSize ?? 2000;
  const cache = new Map<string, DayPanchang>();

  return {
    system,
    defaultLocation,
    at: panchangAt,
    day(date, loc = defaultLocation) {
      const key = `${date}|${loc.lat.toFixed(3)}|${loc.lon.toFixed(3)}`;
      const hit = cache.get(key);
      if (hit) return hit;
      const value = opts.primary?.(date, loc) ?? dayPanchang(date, loc, system);
      cache.set(key, value);
      if (cache.size > max) cache.delete(cache.keys().next().value!);
      return value;
    },
  };
}

/** Default singleton (astronomy engine, Kathmandu, purnimanta). */
export const defaultPanchang = createPanchangProvider();
