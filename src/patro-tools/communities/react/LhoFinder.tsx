'use client';
/** "तपाईंको ल्हो कुन?" — birth date → Tamang, Gurung and Tibetan animal years (runs in browser). */
import { useMemo, useState } from 'react';
import { lhoFor } from '../lhosar/lho';

export function LhoFinder({ initial = '1995-06-15' }: { initial?: string }) {
  const [d, setD] = useState(initial);
  const r = useMemo(() => { try { return lhoFor(d); } catch { return null; } }, [d]);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <label>जन्म मिति (इस्वी) <input type="date" value={d} min="1900-02-01" max="2100-12-31" onChange={(e) => setD(e.target.value)} /></label>
      {r && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {[
            ['तामाङ', r.tamang.emoji, r.tamang.dev, `तामाङ सम्वत् ${r.tamang.era}`],
            ['गुरुङ (तमु)', r.gurung.emoji, r.gurung.dev, 'पुस १५ देखि नयाँ ल्हो'],
            ['शेर्पा / तिब्बती', r.tibetan.emoji, `${r.tibetan.element.dev} ${r.tibetan.element.genderDev} ${r.tibetan.dev}`, `वर्ष ${r.tibetan.era} · ${r.tibetan.element.en} ${r.tibetan.en}`],
          ].map(([who, emo, name, sub]) => (
            <div key={who} style={{ border: '1px solid #ddd', borderRadius: 14, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{who}</div>
              <div style={{ fontSize: 48 }} aria-hidden>{emo}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{name} ल्हो</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}
      <small>गुरुङ ल्होमा खरायोको ठाउँमा बिरालो, ड्रागनको ठाउँमा गरुड र सुँगुरको ठाउँमा मृग पर्छ।</small>
    </div>
  );
}
