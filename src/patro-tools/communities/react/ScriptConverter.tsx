'use client';
/** Generic Devanagari → community script converter (Tirhuta, Limbu, Newa). */
import { useState } from 'react';
import { devanagariToTirhuta, TIRHUTA_FONT_STACK } from '../mithila/tirhuta';
import { devanagariToLimbu, LIMBU_FONT_STACK } from '../kirat/limbu';
import { devanagariToNewa, NEWA_FONT_STACK } from '../../nepal-sambat/newa-script';

const SCRIPTS = {
  tirhuta: { label: 'तिरहुता (मिथिलाक्षर)', fn: devanagariToTirhuta, font: TIRHUTA_FONT_STACK, lang: 'mai-Tirh' },
  limbu: { label: 'लिम्बू (सिरिजङ्गा)', fn: devanagariToLimbu, font: LIMBU_FONT_STACK, lang: 'lif-Limb' },
  newa: { label: 'नेपाल लिपि', fn: devanagariToNewa, font: NEWA_FONT_STACK, lang: 'new-Newa' },
} as const;

export function ScriptConverter({ script, sample }: { script: keyof typeof SCRIPTS; sample: string }) {
  const s = SCRIPTS[script];
  const [text, setText] = useState(sample);
  const out = s.fn(text);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label htmlFor={`sc-${script}`}>देवनागरीमा लेख्नुहोस् → {s.label}</label>
      <textarea id={`sc-${script}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} style={{ fontSize: 18 }} />
      <div lang={s.lang} style={{ fontFamily: s.font, fontSize: 30, padding: 12, background: '#f4efe3', borderRadius: 10, minHeight: 56 }}>{out}</div>
      <button onClick={() => navigator.clipboard.writeText(out)}>कपी</button>
    </div>
  );
}
