'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalize } from '../spellcheck';
import { toNepaliDigits } from '../../core/names';

export type DictationLanguage = 'ne-NP' | 'en-US';

const MAX_SERVER_RECORDING_MS = 60_000;
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
    .normalize('NFC')
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

  let text = raw.normalize('NFC');
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

function browserRecognizer() {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function canRecordForServer() {
  return typeof window !== 'undefined'
    && 'MediaRecorder' in window
    && !!navigator.mediaDevices?.getUserMedia;
}

function preferredMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ].find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function localizedError(language: DictationLanguage, code: string) {
  if (language === 'en-US') {
    if (code === 'not-allowed' || code === 'service-not-allowed') return 'Please allow microphone access.';
    if (code === 'no-speech') return 'No speech was detected. Please try again.';
    return `Speech recognition error: ${code}`;
  }
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'माइक्रोफोन अनुमति दिनुहोस्।';
  if (code === 'no-speech') return 'आवाज सुनिएन। फेरि प्रयास गर्नुहोस्।';
  return `आवाज पहिचान त्रुटि: ${code}`;
}

export function useNepaliDictation({
  onFinal,
  serverFallback = true,
  language = 'ne-NP',
}: DictationOptions = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('unsupported');
  const recRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const serverTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const clearServerTimer = useCallback(() => {
    if (serverTimerRef.current !== null) {
      window.clearTimeout(serverTimerRef.current);
      serverTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    const SR = browserRecognizer();
    if (SR) setMode('browser');
    else if (serverFallback && canRecordForServer()) setMode('server');
    else setMode('unsupported');
  }, [serverFallback]);

  const stop = useCallback(() => {
    setInterim('');
    clearServerTimer();
    const recognition = recRef.current;
    recRef.current = null;
    try { recognition?.stop?.(); } catch { /* already stopped */ }

    const media = mediaRef.current;
    if (media && media.state !== 'inactive') {
      try { media.stop(); } catch { stopTracks(); }
    } else if (!media) {
      stopTracks();
    }
    setListening(false);
  }, [clearServerTimer, stopTracks]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearServerTimer();
      try { recRef.current?.abort?.(); } catch { /* no-op */ }
      try {
        if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
      } catch { /* no-op */ }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearServerTimer]);

  useEffect(() => {
    if (!listening) return;
    stop();
  // Stop an active recognizer before switching recognition language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const start = useCallback(async () => {
    setError(null);
    setInterim('');

    if (mode === 'browser') {
      const SR = browserRecognizer();
      if (!SR) {
        if (serverFallback && canRecordForServer()) setMode('server');
        else setMode('unsupported');
        return;
      }

      const rec = new SR();
      rec.lang = language;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => mountedRef.current && setListening(true);
      rec.onresult = (event: any) => {
        let live = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = String(result?.[0]?.transcript ?? '');
          if (result.isFinal) {
            const processed = postProcessDictation(transcript, {
              language,
              nepaliDigits: language === 'ne-NP',
            });
            if (processed) onFinal?.(`${processed} `);
          } else {
            live += `${transcript} `;
          }
        }
        if (mountedRef.current) setInterim(live.trimStart());
      };
      rec.onerror = (event: any) => {
        const code = String(event?.error || 'unknown');
        if (!mountedRef.current) return;
        setListening(false);
        setInterim('');
        if (serverFallback && canRecordForServer() && ['network', 'language-not-supported'].includes(code)) {
          setMode('server');
          setError(language === 'ne-NP'
            ? 'ब्राउजरको आवाज सेवा उपलब्ध भएन। फेरि माइक्रोफोन थिच्दा server transcription प्रयोग हुन्छ।'
            : 'Browser speech service failed. Press the microphone again to use server transcription.');
        } else {
          setError(localizedError(language, code));
        }
      };
      rec.onend = () => {
        if (recRef.current === rec) recRef.current = null;
        if (!mountedRef.current) return;
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        streamRef.current = stream;
        const mimeType = preferredMimeType();
        const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        rec.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };
        rec.onerror = () => {
          if (!mountedRef.current) return;
          setError(language === 'ne-NP' ? 'आवाज रेकर्ड गर्न सकिएन।' : 'Audio recording failed.');
        };
        rec.onstop = async () => {
          clearServerTimer();
          stopTracks();
          const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
          try {
            if (!blob.size) throw new Error(language === 'ne-NP' ? 'आवाज रेकर्ड भएन।' : 'No audio was recorded.');
            const body = new FormData();
            body.append('audio', blob, 'speech');
            body.append('language', language);
            const response = await fetch('/api/nepali/stt', { method: 'POST', body });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              const code = String(payload?.error || `HTTP ${response.status}`);
              throw new Error(language === 'ne-NP'
                ? `Server आवाज पहिचान असफल भयो (${code})।`
                : `Server speech recognition failed (${code}).`);
            }
            const processed = postProcessDictation(String(payload?.text ?? ''), {
              language,
              nepaliDigits: language === 'ne-NP',
            });
            if (processed) onFinal?.(`${processed} `);
          } catch (cause) {
            if (mountedRef.current) {
              setError(cause instanceof Error
                ? cause.message
                : (language === 'ne-NP' ? 'आवाज पहिचान असफल भयो।' : 'Speech recognition failed.'));
            }
          } finally {
            mediaRef.current = null;
            if (mountedRef.current) setListening(false);
          }
        };
        mediaRef.current = rec;
        rec.start(1_000);
        setListening(true);
        serverTimerRef.current = window.setTimeout(() => {
          if (mediaRef.current === rec && rec.state !== 'inactive') rec.stop();
        }, MAX_SERVER_RECORDING_MS);
      } catch (cause) {
        stopTracks();
        setListening(false);
        setError(cause instanceof Error
          ? cause.message
          : (language === 'ne-NP' ? 'माइक्रोफोन अनुमति दिनुहोस्।' : 'Please allow microphone access.'));
      }
      return;
    }

    setError(language === 'ne-NP'
      ? 'यो ब्राउजरमा आवाज टाइपिङ उपलब्ध छैन। Chrome/Edge प्रयोग गर्नुहोस् वा MediaRecorder समर्थित ब्राउजर प्रयोग गर्नुहोस्।'
      : 'Voice typing is not available in this browser. Try Chrome/Edge or a browser with MediaRecorder support.');
  }, [clearServerTimer, language, mode, onFinal, serverFallback, stopTracks]);

  return { mode, listening, interim, error, language, start, stop };
}
