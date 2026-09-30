'use client';
/** देवनागरी ⇄ नेपाल लिपि (प्रचलित) converter with copy + digits. */
import { useState } from 'react';
import { devanagariToNewa, newaToDevanagari, isNewa } from '../newa-script';
import { NewaText } from './NewaText';

export function NewaLipiConverter() {
  const [text, setText] = useState('न्हूदँया भिन्तुना');
  const newa = isNewa(text);
  const out = newa ? newaToDevanagari(text) : devanagariToNewa(text, { latinDigits: true });
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <label htmlFor="nl-in">{newa ? 'नेपाल लिपि' : 'देवनागरी'} मा लेख्नुहोस्</label>
      <textarea id="nl-in" rows={4} value={text} onChange={(e) => setText(e.target.value)} style={{ fontSize: 18, fontFamily: newa ? '"Noto Sans Newa", sans-serif' : undefined }} />
      <div aria-live="polite" style={{ padding: 12, background: '#f4efe3', borderRadius: 8, fontSize: 26, minHeight: 56 }}>
        {newa ? out : <NewaText>{out}</NewaText>}
      </div>
      <button onClick={() => navigator.clipboard.writeText(out)}>कपी गर्नुहोस्</button>
      <small>युनिकोड नेपाल लिपि (U+11400–1147F)। Noto Sans Newa फन्ट चाहिन्छ; पुराना फोनमा अक्षर नदेखिन सक्छ।</small>
    </div>
  );
}
