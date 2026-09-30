'use client';
/** Prayer times + sehri/iftar + Qibla for a Nepal city or the user's location. Computed in the browser. */
import { useMemo, useState } from 'react';
import { METHODS, NEPAL_CITIES, prayerTimes, qibla, type MethodId } from '../hijri/prayer';
import { HIJRI_MONTHS, hijriOf } from '../hijri/calendar';
import type { GeoLocation } from '../../core/types';

const t = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' });

export function PrayerTimesCard({ date }: { date: string }) {
  const [loc, setLoc] = useState<GeoLocation>(NEPAL_CITIES[0]);
  const [method, setMethod] = useState<MethodId>('karachi');
  const [asr, setAsr] = useState<'hanafi' | 'shafii'>('hanafi');
  const p = useMemo(() => prayerTimes(date, loc, method, asr), [date, loc, method, asr]);
  const h = useMemo(() => hijriOf(date, loc), [date, loc]);
  const locate = () => navigator.geolocation?.getCurrentPosition((pos) => setLoc({ name: 'मेरो स्थान', lat: pos.coords.latitude, lon: pos.coords.longitude, tz: 'Asia/Kathmandu' }));
  return (
    <section style={{ border: '1px solid #cfe3d6', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={NEPAL_CITIES.indexOf(loc)} onChange={(e) => setLoc(NEPAL_CITIES[Number(e.target.value)])} aria-label="शहर">
          {NEPAL_CITIES.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
        </select>
        <button onClick={locate}>📍 मेरो स्थान</button>
        <select value={method} onChange={(e) => setMethod(e.target.value as MethodId)} aria-label="विधि">
          {Object.entries(METHODS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <select value={asr} onChange={(e) => setAsr(e.target.value as 'hanafi' | 'shafii')} aria-label="असर">
          <option value="hanafi">असर: हनफी</option><option value="shafii">असर: शाफई</option>
        </select>
      </div>
      <p style={{ fontSize: 18, margin: '12px 0' }}>{h.day} {HIJRI_MONTHS[h.month - 1].dev} {h.year} <span dir="rtl" lang="ar">({HIJRI_MONTHS[h.month - 1].ar})</span> · <small>सम्भावित</small></p>
      <table><tbody>
        {([['फज्र (सेहरी अन्त्य)', p.fajr], ['सूर्योदय', p.sunrise], ['जोहर', p.dhuhr], ['असर', p.asr], ['मगरिब (इफ्तार)', p.maghrib], ['इशा', p.isha]] as [string, Date][]).map(([k, v]) => (
          <tr key={k}><th style={{ textAlign: 'left', paddingRight: 16 }}>{k}</th><td>{t(v)}</td></tr>
        ))}
      </tbody></table>
      <p>🕋 किब्ला: <b>{qibla(loc.lat, loc.lon).toFixed(1)}°</b> (उत्तरबाट घडीको दिशामा)</p>
      <small>गणना विधि देखाइएको छ; आफ्नो मस्जिदको समयसँग मिलाउनुहोस्।</small>
    </section>
  );
}
