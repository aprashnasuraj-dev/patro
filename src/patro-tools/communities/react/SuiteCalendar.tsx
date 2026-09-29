/** Server component: a suite's festivals for a year, grouped by month, with confidence badges. */
import type { ResolvedDate } from '../shared/types';

const BADGE: Record<ResolvedDate['confidence'], [string, string]> = {
  computed: ['गणना', '#2f6f4f'], expected: ['सम्भावित', '#8a6d1a'], announced: ['घोषित', '#1f4f8f'],
};
const MONTHS = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];

export function SuiteCalendar({ rows, hrefBase }: { rows: ResolvedDate[]; hrefBase: string }) {
  const byMonth = new Map<number, ResolvedDate[]>();
  for (const r of rows.filter((r) => !r.region)) {
    const m = Number(r.start.slice(5, 7)) - 1;
    byMonth.set(m, [...(byMonth.get(m) ?? []), r]);
  }
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {[...byMonth.entries()].map(([m, list]) => (
        <section key={m}>
          <h3 style={{ margin: '0 0 6px' }}>{MONTHS[m]}</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {list.map((r) => {
              const [label, color] = BADGE[r.confidence];
              return (
                <li key={r.festival.id + r.main} style={{ border: '1px solid #e3dccb', borderRadius: 12, padding: 12 }}>
                  <a href={`${hrefBase}/${r.festival.id}`} style={{ fontWeight: 700, fontSize: 17 }}>{r.festival.dev}</a>
                  <span style={{ marginInlineStart: 8, fontSize: 12, padding: '2px 8px', borderRadius: 999, background: color, color: '#fff' }}>{label}</span>
                  {r.festival.status === 'review' && <span style={{ marginInlineStart: 6, fontSize: 12, opacity: 0.7 }}>समीक्षाधीन</span>}
                  <div style={{ opacity: 0.75, fontSize: 14 }}>{r.festival.roman} · {r.start === r.end ? r.main : `${r.start} – ${r.end}`}</div>
                  <p style={{ margin: '6px 0 0', fontSize: 15 }}>{r.festival.summary}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
