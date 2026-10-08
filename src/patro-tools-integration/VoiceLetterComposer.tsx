import { useRef, useState } from 'react';
import { useNepaliDictation } from '../patro-tools/language/react/useNepaliDictation';
import { VoiceHelp } from '../patro-tools/language/react/VoiceHelp';
import { applicationLetter, LETTER_DEFAULTS, type LetterKind, type LetterFields } from '../patro-tools/language/application-letter';
export default function VoiceLetterComposer() {
  const [kind, setKind] = useState<LetterKind>('leave');
  const [fields, setFields] = useState<LetterFields>({ recipient: '', name: '', subject: LETTER_DEFAULTS.leave.subject, body: '', date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' }) });
  const [active, setActive] = useState<keyof LetterFields>('body');
  const [reviewed, setReviewed] = useState(false), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const target = useRef(active); target.current = active;
  const paper = useRef<HTMLDivElement>(null);
  const voice = useNepaliDictation({ onFinal(text) { const key = target.current; setFields(old => ({ ...old, [key]: `${old[key]} ${text}`.trim().slice(0, key === 'body' ? 5000 : 160) })); setReviewed(false); } });
  async function exportPdf() {
    if (!reviewed || !paper.current || busy) return;
    setBusy(true);
    try { const mod = await import('html2pdf.js'); await mod.default().set({ margin: 15, filename: 'aafnai-nibedan.pdf', html2canvas: { scale: 2, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(paper.current).save(); setStatus('PDF तयार भयो।'); }
    catch { setStatus('PDF तयार भएन। Print बाट Save as PDF प्रयोग गर्न सक्नुहुन्छ।'); } finally { setBusy(false); }
  }
  return <section className="patro-tool-card"><h2>बोलेर निवेदन · Voice application</h2>
    <label>नमुना<select value={kind} disabled={voice.listening} onChange={e => { const next = e.target.value as LetterKind; setKind(next); setFields(old => ({ ...old, subject: LETTER_DEFAULTS[next].subject })); setReviewed(false); }}><option value="leave">बिदा</option><option value="recommendation">सिफारिस</option><option value="office">कार्यालय अनुरोध</option></select></label>
    <p>{LETTER_DEFAULTS[kind].prompt} तथ्य आफैं भर्नुहोस्; नमुनाले प्रमाण/स्वीकृति बनाउँदैन।</p>
    {([['recipient','प्राप्तकर्ता'],['name','निवेदक'],['subject','विषय'],['date','मिति'],['body','विवरण']] as const).map(([key,label]) => <label className="tool-block-label" key={key}>{label}<textarea value={fields[key]} rows={key === 'body' ? 5 : 1} maxLength={key === 'body' ? 5000 : 160} disabled={voice.listening && active !== key} onFocus={() => { if (!voice.listening) setActive(key); }} onChange={e => { setFields({ ...fields, [key]: e.target.value }); setReviewed(false); }}/></label>)}
    <label>कुन खण्ड बोल्ने?<select value={active} disabled={voice.listening || voice.processing} onChange={e => setActive(e.target.value as keyof LetterFields)}>{Object.keys(fields).map(key => <option key={key} value={key}>{key}</option>)}</select></label>
    <button type="button" disabled={voice.mode === 'unsupported' || voice.processing && !voice.listening} onClick={() => voice.listening ? voice.stop() : void voice.start()}>{voice.listening ? '■ रोक्नुहोस्' : '🎙 छानिएको खण्ड बोल्नुहोस्'}</button>
    <p aria-live="polite">{voice.interim}</p><VoiceHelp unsupported={voice.mode === 'unsupported'} checked={voice.capabilitiesChecked} serverAvailable={voice.serverAvailable} browserFailure={voice.browserFailure}/>{voice.error ? <p role="alert">{voice.error}</p> : null}
    <div ref={paper} style={{ whiteSpace: 'pre-wrap', background: 'white', color: '#171717', padding: 24 }}>{applicationLetter(fields)}</div>
    <label><input type="checkbox" checked={reviewed} disabled={voice.listening || voice.processing} onChange={e => setReviewed(e.target.checked)}/> नाम, मिति र सबै विवरण जाँचें</label>
    <button type="button" disabled={!reviewed || !fields.name.trim() || !fields.recipient.trim() || !fields.body.trim() || busy} onClick={() => void exportPdf()}>{busy ? 'PDF…' : 'PDF डाउनलोड'}</button><p role="status">{status}</p>
  </section>;
}
