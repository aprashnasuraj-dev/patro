'use client';
/**
 * Newspaper-style shareable card. Renders in the browser, then exported to PNG
 * with html-to-image (npm i html-to-image).
 *
 * ⚠️ Why not @vercel/og / Satori for the image? Satori does not shape
 * Devanagari conjuncts (क्ष, श्र, द्ध break apart). Render in the browser
 * (correct shaping), upload the PNG once, and use that URL as the og:image
 * of /janmadin/[id] so Viber/Facebook previews look right.
 */
import { useRef, useState } from 'react';
import type { BirthFrontPage as Model } from './build';
import { MoonSvg } from './MoonSvg';
import { toNepaliDigits } from '../core/names';

const paper = '#f6f1e4';
const ink = '#1b1b1b';
const accent = '#9b1c1c';

export function BirthFrontPage({ model, brand = 'मेरो पात्रो', shareUrl }: { model: Model; brand?: string; shareUrl?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(ref.current, { pixelRatio: 2, backgroundColor: paper });
      if (!blob) return;
      const file = new File([blob], 'janmadin.png', { type: 'image/png' });
      const text = `${model.shareText} ${shareUrl ?? ''}`.trim();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'janmadin.png';
        a.click();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        ref={ref}
        style={{
          width: 540, background: paper, color: ink, padding: 24, boxSizing: 'border-box',
          fontFamily: '"Mukta", "Noto Sans Devanagari", sans-serif', border: `1px solid ${ink}`,
        }}
      >
        <header style={{ textAlign: 'center', borderBottom: `3px double ${ink}`, paddingBottom: 8 }}>
          <div style={{ fontSize: 12, letterSpacing: 2 }}>{brand} · विशेष अंक</div>
          <h1 style={{ fontFamily: '"Tiro Devanagari Sanskrit", serif', fontSize: 40, margin: '4px 0', lineHeight: 1.1 }}>{model.masthead}</h1>
          <div style={{ fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span>{model.bsLabel}</span><span>{model.weekday}</span><span>{model.adLabel}</span>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16, padding: '16px 0', borderBottom: `1px solid ${ink}` }}>
          <div>
            <div style={{ color: accent, fontWeight: 700, fontSize: 13 }}>मुख्य समाचार</div>
            <h2 style={{ fontSize: 24, margin: '4px 0 8px', lineHeight: 1.25 }}>
              {model.lunar}, {model.nakshatra} नक्षत्रमा नयाँ सदस्यको आगमन
            </h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
              त्यो दिन सूर्योदय {toNepaliDigits(model.sunrise)} मा र सूर्यास्त {toNepaliDigits(model.sunset)} मा भयो।
              चन्द्रमा {model.rashi} राशिमा थियो। नाम राख्ने अक्षर: <b>“{model.nameSyllable}”</b>।
              {model.festivalLine ? ` ${model.festivalLine}।` : ''}
            </p>
          </div>
          <figure style={{ margin: 0, textAlign: 'center' }}>
            <MoonSvg angle={model.moonPhaseAngle} size={110} />
            <figcaption style={{ fontSize: 12 }}>{model.moonHeadline}</figcaption>
          </figure>
        </section>

        {model.headlines.length > 0 && (
          <section style={{ padding: '12px 0', borderBottom: `1px solid ${ink}` }}>
            <div style={{ color: accent, fontWeight: 700, fontSize: 13 }}>त्यही दिन संसारमा</div>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
              {model.headlines.map((h, i) => <li key={i}>{h.scope === 'nepal' ? '🇳🇵 ' : '🌐 '}{h.title}</li>)}
            </ul>
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 12, fontSize: 14 }}>
          <div>
            <div style={{ color: accent, fontWeight: 700, fontSize: 13 }}>अंकमा</div>
            <b style={{ fontSize: 26 }}>{toNepaliDigits(model.stats.daysAlive.toLocaleString('en-IN'))}</b> दिन यो धर्तीमा
          </div>
          <div>
            <div style={{ color: accent, fontWeight: 700, fontSize: 13 }}>अर्को तिथि जन्मदिन</div>
            <b>{model.stats.nextTithiBirthdayBs}</b>
          </div>
        </section>
        <footer style={{ marginTop: 12, fontSize: 11, textAlign: 'center', opacity: 0.7 }}>आफ्नो जन्मदिनको अखबार बनाउनुहोस् · {brand}</footer>
      </div>
      <button onClick={share} disabled={busy} style={{ marginTop: 12 }}>{busy ? 'तयार हुँदैछ…' : 'सेयर गर्नुहोस्'}</button>
    </div>
  );
}
