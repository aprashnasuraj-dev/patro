import { KATHMANDU, type GeoLocation } from '../patro-tools/core/types';
export type SavedPlace = Required<Pick<GeoLocation,'name'|'lat'|'lon'|'tz'>> & { source: 'city'|'geolocation'|'weather' };
export const PLACE_KEY = 'patro.place.v1';
export const PLACE_EVENT = 'patro:place';
export function validPlace(value: unknown): value is SavedPlace {
 if (!value || typeof value !== 'object') return false; const p = value as SavedPlace;
 if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100 || !Number.isFinite(p.lat) || Math.abs(p.lat)>90 || !Number.isFinite(p.lon) || Math.abs(p.lon)>180 || !['city','geolocation','weather'].includes(p.source)) return false;
 try { new Intl.DateTimeFormat('en',{timeZone:p.tz}).format(); return typeof p.tz === 'string'; } catch { return false; }
}
export function readPlace(storage: Pick<Storage,'getItem'> = localStorage): SavedPlace | null { try { const p = JSON.parse(storage.getItem(PLACE_KEY)||'null'); return validPlace(p)?p:null; } catch { return null; } }
export function effectivePlace(): GeoLocation { return readPlace() || KATHMANDU; }
export function savePlace(place: SavedPlace | null) { if (place && !validPlace(place)) throw Error('Invalid place'); if(place) localStorage.setItem(PLACE_KEY,JSON.stringify(place)); else localStorage.removeItem(PLACE_KEY); window.dispatchEvent(new Event(PLACE_EVENT)); }
export function deviceZone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kathmandu'; }
