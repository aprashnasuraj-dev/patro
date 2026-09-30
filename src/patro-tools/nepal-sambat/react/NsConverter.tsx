'use client';
/**
 * Converter: AD ⇄ lunar NS ⇄ solar NS. Runs fully in the browser
 * (astronomy-engine, ~2 ms per conversion).
 */
import { useMemo, useState } from 'react';
import { adFromNs, adFromSolarNs, formatNs, nsFromAd, solarNsFromAd } from '../engine';
import { NS_MONTHS, NS_TITHIS_GA, NS_TITHIS_THWA } from '../data/calendar';
import { NewaText } from './NewaText';
import { toNepaliDigits } from '../../core/names';

type Mode = 'ad' | 'lunar' | 'solar';

export function NsConverter({ today }: { today: string }) {
  const [mode, setMode] = useState<Mode>('ad');
  const [ad, setAd] = useState(today);
  const [lunar, setLunar] = useState({ year: 1147, month: 1, paksha: 'thwa' as 'thwa' | 'ga', tithi: 1, adhik: false });
  const [solar, setSolar] = useState({ year: 1147, month: 1, day: 1 });

  const result = useMemo(() => {
    try {
      const date = mode === 'ad' ? ad : mode === 'lunar' ? adFromNs(lunar) : adFromSolarNs(solar);
      const n = nsFromAd(date);
      return { date, n, s: solarNsFromAd(date), error: null as string | null };
    } catch (e) {
      return { error: mode === 'lunar' ? 'यो तिथि यस वर्ष छैन (क्षय/अधिक जाँच्नुहोस्)।' : 'मिति मिलेन।' } as const;
    }
  }, [mode, ad, lunar, solar]);

  const num = (v: string) => Number(v) || 0;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div role="tablist" style={{ display: 'flex', gap: 6 }}>
        {([['ad', 'इस्वी/वि.सं. मिति'], ['lunar', 'चान्द्र ने.सं.'], ['solar', 'सौर्य ने.सं.']] as [Mode, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} style={{ fontWeight: mode === k ? 700 : 400 }}>{l}</button>
        ))}
      </div>

      {mode === 'ad' && <input type="date" value={ad} onChange={(e) => setAd(e.target.value)} aria-label="इस्वी मिति" />}

      {mode === 'lunar' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input type="number" value={lunar.year} onChange={(e) => setLunar({ ...lunar, year: num(e.target.value) })} aria-label="ने.सं. वर्ष" style={{ width: 90 }} />
          <select value={lunar.month} onChange={(e) => setLunar({ ...lunar, month: num(e.target.value) })} aria-label="महिना">
            {NS_MONTHS.map((m) => <option key={m.n} value={m.n}>{m.dev}</option>)}
          </select>
          <select value={lunar.paksha} onChange={(e) => setLunar({ ...lunar, paksha: e.target.value as 'thwa' | 'ga' })} aria-label="पक्ष">
            <option value="thwa">थ्वः</option><option value="ga">गाः</option>
          </select>
          <select value={lunar.tithi} onChange={(e) => setLunar({ ...lunar, tithi: num(e.target.value) })} aria-label="तिथि">
            {(lunar.paksha === 'thwa' ? NS_TITHIS_THWA : NS_TITHIS_GA).map((t, i) => <option key={t} value={i + 1}>{t}</option>)}
          </select>
          <label><input type="checkbox" checked={lunar.adhik} onChange={(e) => setLunar({ ...lunar, adhik: e.target.checked })} /> अनला (अधिक)</label>
        </div>
      )}

      {mode === 'solar' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="number" value={solar.year} onChange={(e) => setSolar({ ...solar, year: num(e.target.value) })} aria-label="वर्ष" style={{ width: 90 }} />
          <select value={solar.month} onChange={(e) => setSolar({ ...solar, month: num(e.target.value) })} aria-label="महिना">
            {NS_MONTHS.map((m) => <option key={m.n} value={m.n}>{m.dev}</option>)}
          </select>
          <input type="number" min={1} max={31} value={solar.day} onChange={(e) => setSolar({ ...solar, day: num(e.target.value) })} aria-label="गते" style={{ width: 70 }} />
        </div>
      )}

      <output aria-live="polite" style={{ padding: 12, borderRadius: 8, background: '#f4efe3' }}>
        {'error' in result && result.error ? result.error : 'n' in result && result.n && (
          <>
            <div><b>इस्वी:</b> {result.date}</div>
            <div><b>चान्द्र ने.सं.:</b> {formatNs(result.n, 'dev', { weekday: true })}</div>
            <div><NewaText size={20}>{formatNs(result.n, 'newa')}</NewaText></div>
            <div><b>Roman:</b> {formatNs(result.n, 'roman')}</div>
            <div><b>सौर्य ने.सं.:</b> {toNepaliDigits(result.s.year)} {NS_MONTHS[result.s.month - 1].dev} {toNepaliDigits(result.s.day)}</div>
          </>
        )}
      </output>
    </div>
  );
}
