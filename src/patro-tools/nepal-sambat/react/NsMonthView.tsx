/**
 * Lunar month grid (server component friendly). Build `days` on the server:
 *   const days = datesOfMonth.map(ad => ({ ad, bs: yourBs(ad), ns: nsFromAd(ad), festivals: [...] }))
 */
import type { NsLunarDate } from '../engine';
import { monthLabel, tithiLabel } from '../engine';
import { NewaText } from './NewaText';
import { devanagariToNewa } from '../newa-script';
import { toNepaliDigits } from '../../core/names';

export interface NsDayCell { ad: string; bs?: string; ns: NsLunarDate; festivals: { id: string; dev: string }[] }

const WEEK = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

export function NsMonthView({ days, showNewa = true }: { days: NsDayCell[]; showNewa?: boolean }) {
  if (!days.length) return null;
  const first = new Date(`${days[0].ad}T00:00:00Z`).getUTCDay();
  const head = days[0].ns;
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        ने.सं. {toNepaliDigits(head.year)} {monthLabel(head.month, head.adhik)}
        {showNewa && <NewaText size={18} style={{ marginInlineStart: 8, opacity: 0.8 }}>{monthLabel(head.month, head.adhik, 'newa')}</NewaText>}
      </figcaption>
      <div role="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4 }}>
        {WEEK.map((w) => <div key={w} role="columnheader" style={{ textAlign: 'center', fontSize: 12, opacity: 0.7 }}>{w}</div>)}
        {Array.from({ length: first }, (_, i) => <div key={`e${i}`} />)}
        {days.map((d) => {
          const special = d.ns.tithi === 15 || d.festivals.length > 0;
          return (
            <div key={d.ad} role="gridcell" title={d.ad}
              style={{ border: '1px solid #e2d8c3', borderRadius: 8, padding: 4, minHeight: 64, background: special ? '#fff4d6' : '#fff', fontSize: 11 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{tithiLabel(d.ns.paksha, d.ns.tithi)}</div>
              {showNewa && <NewaText size={11} style={{ opacity: 0.7 }}>{devanagariToNewa(tithiLabel(d.ns.paksha, d.ns.tithi))}</NewaText>}
              <div style={{ opacity: 0.6 }}>{d.bs ?? d.ad.slice(5)}</div>
              {d.festivals.map((f) => <div key={f.id} style={{ color: '#8f1f21', fontWeight: 600 }}>{f.dev}</div>)}
            </div>
          );
        })}
      </div>
    </figure>
  );
}
