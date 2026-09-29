'use client';
/**
 * Nepali voice typing.
 *
 * Browser path (free): Web Speech API with lang "ne-NP" — works in Chrome /
 * Edge (desktop + Android). Not available in Firefox; limited on iOS.
 * Fallback: record with MediaRecorder and POST to /api/nepali/stt, where you
 * plug in a server STT that supports Nepali (Google Cloud Speech-to-Text,
 * Azure Speech, or a self-hosted Whisper/MMS model).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalize } from '../spellcheck';
import { toNepaliDigits } from '../../core/names';

/** Spoken punctuation → symbols. Users say "पूर्णविराम" and get "।". */
const SPOKEN: [RegExp, string][] = [
  [/\s*पूर्णविराम/g, '।'],
  [/\s*अल्पविराम/g, ','],
  [/\s*प्रश्नवाचक(?: चिन्ह)?|\s*प्रश्नचिन्ह/g, '?'],
  [/\s*उद्गार(?: चिन्ह)?/g, '!'],
  [/\s*नयाँ (?:लाइन|अनुच्छेद)\s*/g, '\n'],
];

export function postProcessDictation(raw: string, opts: { nepaliDigits?: boolean } = {}): string {
  let t = raw;
  for (const [re, sym] of SPOKEN) t = t.replace(re, sym);
  if (opts.nepaliDigits ?? true) t = toNepaliDigits(t);
  return normalize(t).text;
}

type Mode = 'browser' | 'server' | 'unsupported';

export function useNepaliDictation(opts: { onFinal?: (text: string) => void; serverFallback?: boolean } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const [mode, setMode] = useState<Mode>('unsupported');

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setMode('browser');
    else if (opts.serverFallback !== false && 'MediaRecorder' in window) setMode('server');
  }, [opts.serverFallback]);

  const start = useCallback(async () => {
    setError(null);
    if (mode === 'browser') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'ne-NP';
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let live = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) opts.onFinal?.(postProcessDictation(r[0].transcript) + ' ');
          else live += r[0].transcript;
        }
        setInterim(live);
      };
      rec.onerror = (e: any) => {
        setListening(false);
        setError(e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'माइक्रोफोन अनुमति दिनुहोस्'
          : `त्रुटि: ${e.error}`);
      };
      rec.onend = () => { setListening(false); setInterim(''); };
      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch (error) {
        setListening(false);
        setError(error instanceof Error ? error.message : 'आवाज टाइपिङ सुरु गर्न सकिएन।');
      }
      return;
    }
    if (mode === 'server') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          try {
            const body = new FormData();
            body.append('audio', new Blob(chunks, { type: rec.mimeType }), 'speech.webm');
            const res = await fetch('/api/nepali/stt', { method: 'POST', body });
            if (!res.ok) throw new Error('आवाज पहिचान असफल');
            const { text } = await res.json();
            opts.onFinal?.(postProcessDictation(text) + ' ');
          } catch (error) {
            setError(error instanceof Error ? error.message : 'आवाज पहिचान असफल');
          } finally {
            setListening(false);
          }
        };
        mediaRef.current = rec;
        rec.start();
        setListening(true);
      } catch (error) {
        setListening(false);
        setError(error instanceof Error ? error.message : 'माइक्रोफोन अनुमति दिनुहोस्');
      }
      return;
    }
    setError('यो ब्राउजरमा आवाज टाइपिङ उपलब्ध छैन। Chrome प्रयोग गर्नुहोस्।');
  }, [mode, opts]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    mediaRef.current?.stop();
    setListening(false);
  }, []);

  return { mode, listening, interim, error, start, stop };
}
