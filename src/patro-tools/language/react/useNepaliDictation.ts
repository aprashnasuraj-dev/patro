'use client';
/**
 * Browser voice typing for Nepali and English.
 *
 * Browser path (free): Web Speech API with a caller-selected recognition locale.
 * Fallback: record with MediaRecorder and POST to /api/nepali/stt, where a server
 * STT implementation can optionally use the submitted language hint.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalize } from '../spellcheck';
import { toNepaliDigits } from '../../core/names';

export type DictationLanguage = 'ne-NP' | 'en-US';

const NEPALI_SPOKEN: [RegExp, string][] = [
  [/\s*पूर्णविराम/g, '।'],
  [/\s*अल्पविराम/g, ','],
  [/\s*प्रश्नवाचक(?: चिन्ह)?|\s*प्रश्नचिन्ह/g, '?'],
  [/\s*उद्गार(?: चिन्ह)?/g, '!'],
  [/\s*नयाँ (?:लाइन|अनुच्छेद)\s*/g, '\n'],
];

const ENGLISH_SPOKEN: [RegExp, string][] = [
  [/\s*\b(?:full stop|period)\b/gi, '.'],
  [/\s*\bcomma\b/gi, ','],
  [/\s*\bquestion mark\b/gi, '?'],
  [/\s*\b(?:exclamation mark|exclamation point)\b/gi, '!'],
  [/\s*\bnew line\b\s*/gi, '\n'],
  [/\s*\bnew paragraph\b\s*/gi, '\n\n'],
];

function cleanEnglishSpacing(raw: string): string {
  return raw
    .replace(/[ \t]+([,?.!])/g, '$1')
    .replace(/([,?.!])(?=[^\s\n])/g, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

export function postProcessEnglishDictation(raw: string): string {
  let text = raw;
  for (const [re, symbol] of ENGLISH_SPOKEN) text = text.replace(re, symbol);
  return cleanEnglishSpacing(text);
}

export function postProcessDictation(
  raw: string,
  opts: { nepaliDigits?: boolean; language?: DictationLanguage } = {},
): string {
  const language = opts.language ?? 'ne-NP';
  if (language === 'en-US') return postProcessEnglishDictation(raw);

  let text = raw;
  for (const [re, symbol] of NEPALI_SPOKEN) text = text.replace(re, symbol);
  if (opts.nepaliDigits ?? true) text = toNepaliDigits(text);
  return normalize(text).text;
}

type Mode = 'browser' | 'server' | 'unsupported';

type DictationOptions = {
  onFinal?: (text: string) => void;
  serverFallback?: boolean;
  language?: DictationLanguage;
};

export function useNepaliDictation({
  onFinal,
  serverFallback = true,
  language = 'ne-NP',
}: DictationOptions = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const [mode, setMode] = useState<Mode>('unsupported');

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setMode('browser');
    else if (serverFallback && 'MediaRecorder' in window) setMode('server');
    else setMode('unsupported');
  }, [serverFallback]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    mediaRef.current?.stop();
    recRef.current = null;
    mediaRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  useEffect(() => {
    if (listening) stop();
  }, [language]);

  const start = useCallback(async () => {
    setError(null);
    setInterim('');

    if (mode === 'browser') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = language;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => setListening(true);
      rec.onresult = (event: any) => {
        let live = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result?.[0]?.transcript ?? '';
          if (result.isFinal) {
            const processed = postProcessDictation(transcript, {
              language,
              nepaliDigits: language === 'ne-NP',
            });
            if (processed) onFinal?.(`${processed} `);
          } else {
            live += transcript;
          }
        }
        setInterim(live.trimStart());
      };
      rec.onerror = (event: any) => {
        setListening(false);
        setError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? (language === 'ne-NP' ? 'माइक्रोफोन अनुमति दिनुहोस्।' : 'Please allow microphone access.')
          : (language === 'ne-NP' ? `आवाज पहिचान त्रुटि: ${event.error}` : `Speech recognition error: ${event.error}`));
      };
      rec.onend = () => {
        recRef.current = null;
        setListening(false);
        setInterim('');
      };
      recRef.current = rec;
      try {
        rec.start();
      } catch (cause) {
        recRef.current = null;
        setListening(false);
        setError(cause instanceof Error
          ? cause.message
          : (language === 'ne-NP' ? 'आवाज टाइपिङ सुरु गर्न सकिएन।' : 'Voice typing could not start.'));
      }
      return;
    }

    if (mode === 'server') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        rec.ondataavailable = (event) => chunks.push(event.data);
        rec.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          try {
            const body = new FormData();
            body.append('audio', new Blob(chunks, { type: rec.mimeType }), 'speech.webm');
            body.append('language', language);
            const response = await fetch('/api/nepali/stt', { method: 'POST', body });
            if (!response.ok) throw new Error(language === 'ne-NP' ? 'आवाज पहिचान असफल भयो।' : 'Speech recognition failed.');
            const payload = await response.json();
            const processed = postProcessDictation(String(payload?.text ?? ''), {
              language,
              nepaliDigits: language === 'ne-NP',
            });
            if (processed) onFinal?.(`${processed} `);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : (language === 'ne-NP' ? 'आवाज पहिचान असफल भयो।' : 'Speech recognition failed.'));
          } finally {
            mediaRef.current = null;
            setListening(false);
          }
        };
        mediaRef.current = rec;
        rec.start();
        setListening(true);
      } catch (cause) {
        setListening(false);
        setError(cause instanceof Error ? cause.message : (language === 'ne-NP' ? 'माइक्रोफोन अनुमति दिनुहोस्।' : 'Please allow microphone access.'));
      }
      return;
    }

    setError(language === 'ne-NP'
      ? 'यो ब्राउजरमा आवाज टाइपिङ उपलब्ध छैन। Chrome वा Edge प्रयोग गर्नुहोस्।'
      : 'Voice typing is not available in this browser. Try Chrome or Edge.');
  }, [language, mode, onFinal]);

  return { mode, listening, interim, error, language, start, stop };
}
