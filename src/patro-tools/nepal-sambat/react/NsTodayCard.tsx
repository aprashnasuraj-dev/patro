'use client';
/**
 * "आज नेपाल सम्बत" card — today's NS date in three scripts, next Mha Puja
 * countdown and the next Newar festival. Pass data from the server (see
 * /api/v1/nepal-sambat) so the card renders without a loading state.
 */
import type { NsLunarDate, NsSolarDate, ResolvedFestival } from '../engine';
import { formatNs } from '../engine';
import { NS_MONTHS } from '../data/calendar';
import { toNepaliDigits } from '../../core/names';
import { NewaText } from './NewaText';
import { ScriptToggle, useNsScript } from './useNsScript';

export interface NsTodayData {
  today: NsLunarDate;
  solar: NsSolarDate;
  daysToNewYear: number;
  nextNewYear: string;
  upcoming: Pick<ResolvedFestival, 'start' | 'end' | 'festival'>[];
}

export function NsTodayCard({ data }: { data: NsTodayData }) {
  const [script, setScript] = useNsScript();
  const label = formatNs(data.today, script, { weekday: script !== 'roman' });
  return (
    <section aria-labelledby="ns-today" style={{ border: '1px solid #d6c7a8', borderRadius: 12, padding: 16, background: '#fbf7ee' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 id="ns-today" style={{ margin: 0, fontSize: 16 }}>आज नेपाल सम्बत</h2>
        <ScriptToggle value={script} onChange={setScript} />
      </header>
      <p style={{ fontSize: 22, margin: '12px 0 4px', fontWeight: 600 }}>
        {script === 'newa' ? <NewaText>{label}</NewaText> : label}
      </p>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
        सौर्य ने.सं. (ललितपुर): {toNepaliDigits(data.solar.year)} {NS_MONTHS[data.solar.month - 1].dev} {toNepaliDigits(data.solar.day)}
      </p>
      <p style={{ margin: '12px 0', fontSize: 15 }}>
        🪔 म्हपूजा / न्हूदँ {toNepaliDigits(data.today.year + 1)}: <b>{toNepaliDigits(data.daysToNewYear)} दिन</b> बाँकी ({data.nextNewYear})
      </p>
      {data.upcoming.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
          {data.upcoming.map((u) => (
            <li key={u.festival.id + u.start}>
              <b>{script === 'newa' ? <NewaText>{u.festival.dev}</NewaText> : script === 'roman' ? u.festival.roman : u.festival.dev}</b> — {u.start}
              {u.festival.declaredAnnually && <small style={{ opacity: 0.7 }}> (सम्भावित)</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
