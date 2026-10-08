import { useEffect, useRef, useState } from 'react';
import { useNepaliDictation } from '../patro-tools/language/react/useNepaliDictation';
import { useNepaliSpeech } from '../patro-tools/language/react/useNepaliSpeech';
import { VoiceHelp } from '../patro-tools/language/react/VoiceHelp';
export default function ElderVoicePanel() {
  const [text, setText] = useState(''), [language, setLanguage] = useState<'ne-NP'|'en-US'>('ne-NP');
  const held = useRef(false), mounted = useRef(true), lastRead = useRef('');
  const speech = useNepaliSpeech();
  const voice = useNepaliDictation({ language, onFinal(segment) { setText(old => `${old} ${segment}`.trim()); } });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; held.current = false; }; }, []);
  useEffect(() => {
    if (!voice.listening && !voice.processing && text.trim() && text !== lastRead.current) { lastRead.current = text; speech.speak(text, { rate: 0.75 }); }
  }, [voice.listening, voice.processing, text, speech.speak]);
  async function begin() { if (held.current || voice.processing) return; held.current = true; speech.stop(); await voice.start(); if (!held.current || !mounted.current) voice.stop(); }
  function end() { held.current = false; voice.stop(); }
  return <section className="patro-tool-card" style={{ fontSize: '1.5rem' }}><h2>हजुरबा मोड · Hold to talk</h2>
    <label>भाषा / Language<select value={language} disabled={voice.listening || voice.processing} onChange={e => setLanguage(e.target.value as typeof language)}><option value="ne-NP">नेपाली</option><option value="en-US">English</option></select></label>
    <p>थिचेर बोल्नुहोस्, छोड्दा रोकिन्छ। Keyboard: Space वा Enter थिचेर राख्नुहोस्।</p>
    <button type="button" className="elder-hold-button" style={{ minHeight: 96, fontSize: '1.5rem', width: '100%', touchAction: 'none' }} disabled={voice.mode === 'unsupported' || voice.processing && !voice.listening}
      onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); void begin(); }} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onBlur={end}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) void begin(); } }} onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } }}>
      {voice.listening ? '■ छोडेर रोक्नुहोस् · Release to stop' : '🎙 थिचेर बोल्नुहोस् · Hold to talk'}</button>
    <label>पाठ / Transcript<textarea style={{ fontSize: '1.5rem', width: '100%', boxSizing: 'border-box' }} rows={6} value={text} onChange={e => { lastRead.current = e.target.value; setText(e.target.value); }}/></label><p aria-live="polite">{voice.interim}</p>
    <button type="button" onClick={() => speech.speak(text, { rate: 0.75 })} disabled={!text || voice.listening}>फेरि सुन्नुहोस् · Read back</button><button type="button" onClick={speech.stop}>पढाइ रोक्नुहोस् · Stop reading</button>
    <VoiceHelp unsupported={voice.mode === 'unsupported'} checked={voice.capabilitiesChecked} browserFailure={voice.browserFailure} serverAvailable={voice.serverAvailable}/>{voice.error || speech.error ? <p role="alert">{voice.error || speech.error}</p> : null}
  </section>;
}
