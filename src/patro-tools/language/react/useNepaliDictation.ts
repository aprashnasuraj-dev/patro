'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalize } from '../spellcheck';
import { toNepaliDigits } from '../../core/names';
import { browserEngineHint, rememberBrowserEngine } from '../voice-engine';

export type DictationLanguage = 'ne-NP' | 'en-US';
export type DictationMode = 'browser' | 'server' | 'unsupported';

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

function cleanEnglishSpacing(raw: string) {
  return raw.normalize('NFC')
    .replace(/[ \t]+([,?.!])/g, '$1')
    .replace(/([,?.!])(?=[^\s\n])/g, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

export function postProcessEnglishDictation(raw: string) {
  let text = raw;
  for (const [pattern, symbol] of ENGLISH_SPOKEN) text = text.replace(pattern, symbol);
  return cleanEnglishSpacing(text);
}

export function postProcessDictation(
  raw: string,
  opts: { nepaliDigits?: boolean; language?: DictationLanguage } = {},
) {
  const language = opts.language ?? 'ne-NP';
  if (language === 'en-US') return postProcessEnglishDictation(raw);
  let text = raw.normalize('NFC');
  for (const [pattern, symbol] of NEPALI_SPOKEN) text = text.replace(pattern, symbol);
  if (opts.nepaliDigits ?? true) text = toNepaliDigits(text);
  return normalize(text).text;
}

function speechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function serverRecordingAvailable() {
  return typeof window !== 'undefined'
    && 'MediaRecorder' in window
    && !!navigator.mediaDevices?.getUserMedia;
}

function preferredMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    .find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function errorMessage(language: DictationLanguage, code: string) {
  if (language === 'en-US') {
    if (code === 'not-allowed' || code === 'service-not-allowed') return 'Please allow microphone access.';
    if (code === 'no-speech') return 'No speech was detected. Please try again.';
    return `Speech recognition error: ${code}`;
  }
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'माइक्रोफोन अनुमति दिनुहोस्।';
  if (code === 'no-speech') return 'आवाज सुनिएन। फेरि प्रयास गर्नुहोस्।';
  return `आवाज पहिचान त्रुटि: ${code}`;
}

function serverErrorMessage(language: DictationLanguage, code: string) {
  const nepali = language === 'ne-NP';
  if (code === 'speech_backend_unconfigured') {
    return nepali
      ? 'Server आवाज सेवा उपलब्ध भएन। Live recognition प्रयोग गर्नुहोस्।'
      : 'Server speech is unavailable. Use live recognition.';
  }
  if (code === 'speech_provider_timeout') {
    return nepali ? 'आवाजलाई पाठमा बदल्न धेरै समय लाग्यो। फेरि प्रयास गर्नुहोस्।' : 'Transcription timed out. Please try again.';
  }
  if (code === 'no_speech_detected') {
    return nepali ? 'रेकर्डिङमा स्पष्ट आवाज भेटिएन। फेरि बोल्नुहोस्।' : 'No clear speech was detected in the recording.';
  }
  if (code === 'speech_provider_failed' || code === 'speech_provider_unreachable') {
    return nepali ? 'Server आवाज सेवा अहिले उपलब्ध छैन। फेरि प्रयास गर्नुहोस्।' : 'Server speech service is temporarily unavailable.';
  }
  return nepali ? `Server आवाज पहिचान असफल भयो (${code})।` : `Server speech recognition failed (${code}).`;
}

export function useNepaliDictation({
  onFinal,
  serverFallback = true,
  language = 'ne-NP',
}: {
  onFinal?: (text: string) => void;
  serverFallback?: boolean;
  language?: DictationLanguage;
} = {}) {
  const [mode, setMode] = useState<DictationMode>('unsupported');
  const [browserWorking, setBrowserWorking] = useState(false);
  const [browserAvailable, setBrowserAvailable] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [capabilitiesChecked, setCapabilitiesChecked] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const listeningIntentRef = useRef(false);
  const capabilitiesReadyRef = useRef<Promise<boolean>>(Promise.resolve(false));
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      listeningIntentRef.current = false;
      clearTimer();
      try { recognitionRef.current?.abort?.(); } catch { /* already ended */ }
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      } catch { /* already ended */ }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearTimer]);

  useEffect(() => {
    const browser = !!speechRecognitionCtor();
    const recorder = serverFallback && serverRecordingAvailable();
    setBrowserAvailable(browser);
    setMode(browser ? 'browser' : 'unsupported');
    setCapabilitiesChecked(false);
    capabilitiesReadyRef.current = Promise.resolve(false);

    if (!recorder) {
      setServerAvailable(false);
      setCapabilitiesChecked(true);
      return;
    }

    const controller = new AbortController();
    capabilitiesReadyRef.current = (async () => {
      try {
        const response = await fetch('/api/nepali/speech-capabilities', {
          headers: { accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!mountedRef.current || controller.signal.aborted) return false;
        const server = response.ok && payload?.stt?.server === true;
        setServerAvailable(server);
        if (server && (!browser || browserEngineHint(language) === false)) setMode('server');
        return server;
      } catch {
        if (!mountedRef.current || controller.signal.aborted) return false;
        setServerAvailable(false);
        return false;
      } finally {
        if (mountedRef.current && !controller.signal.aborted) setCapabilitiesChecked(true);
      }
    })();

    return () => controller.abort();
  }, [serverFallback, language]);

  const stop = useCallback(() => {
    listeningIntentRef.current = false;
    setInterim('');
    clearTimer();
    const recognition = recognitionRef.current;
    try { recognition?.stop?.(); } catch { /* already ended */ }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { stopTracks(); }
    } else if (!recorder) {
      stopTracks();
    }
    setListening(false);
  }, [clearTimer, stopTracks]);

  const selectMode = useCallback((next: Exclude<DictationMode, 'unsupported'>) => {
    if (listening || processing) return;
    if (next === 'browser' && browserAvailable) {
      setError(null);
      setMode('browser');
      return;
    }
    if (next === 'server' && serverAvailable && serverRecordingAvailable()) {
      setError(null);
      setMode('server');
    }
  }, [browserAvailable, listening, processing, serverAvailable]);

  const startServer = useCallback(async () => {
      if (capabilitiesChecked && !serverAvailable) {
        listeningIntentRef.current = false;
        setListening(false);
        setError(serverErrorMessage(language, 'speech_backend_unconfigured'));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (!mountedRef.current || !listeningIntentRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        const mimeType = preferredMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };
        recorder.onerror = () => {
          if (mountedRef.current) setError(language === 'ne-NP' ? 'आवाज रेकर्ड गर्न सकिएन।' : 'Audio recording failed.');
        };
        recorder.onstop = async () => {
          clearTimer();
          stopTracks();
          if (!mountedRef.current) { recorderRef.current = null; return; }
          const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
          if (mountedRef.current) setProcessing(true);
          try {
            if (!blob.size) throw new Error(language === 'ne-NP' ? 'आवाज रेकर्ड भएन।' : 'No audio was recorded.');
            const body = new FormData();
            body.append('audio', blob, 'speech');
            body.append('language', language);
            const response = await fetch('/api/nepali/stt', { method: 'POST', body });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              const code = String(payload?.error || `HTTP ${response.status}`);
              throw new Error(serverErrorMessage(language, code));
            }
            const processed = postProcessDictation(String(payload?.text ?? ''), {
              language,
              nepaliDigits: language === 'ne-NP',
            });
            if (processed && mountedRef.current) onFinalRef.current?.(`${processed} `);
          } catch (cause) {
            if (mountedRef.current) {
              setError(cause instanceof Error ? cause.message : errorMessage(language, 'server-failed'));
            }
          } finally {
            recorderRef.current = null;
            if (mountedRef.current) {
              setProcessing(false);
              setListening(false);
            }
          }
        };

        recorderRef.current = recorder;
        recorder.start(1_000);
        setListening(true);
        timerRef.current = window.setTimeout(() => {
          if (recorderRef.current === recorder && recorder.state !== 'inactive') recorder.stop();
        }, MAX_SERVER_RECORDING_MS);
      } catch (cause) {
        listeningIntentRef.current = false;
        stopTracks();
        setListening(false);
        setError(cause instanceof Error ? cause.message : errorMessage(language, 'not-allowed'));
      }
      return;
  }, [capabilitiesChecked, clearTimer, language, serverAvailable, stopTracks]);

  const start = useCallback(async () => {
    if (processing || listening) return;
    listeningIntentRef.current = true;
    setError(null);
    setInterim('');
    setBrowserWorking(false);

    if (mode === 'server') { await startServer(); return; }
    if (mode === 'browser') {
      const SR = speechRecognitionCtor();
      if (!SR) {
        setBrowserAvailable(false);
        if (serverFallback && await capabilitiesReadyRef.current) { setMode('server'); await startServer(); }
        else { listeningIntentRef.current = false; setListening(false); setError(serverErrorMessage(language, 'speech_backend_unconfigured')); }
        return;
      }
      let recognition: any;
      try { recognition = new SR(); }
      catch {
        rememberBrowserEngine(language, false);
        if (serverFallback && await capabilitiesReadyRef.current && listeningIntentRef.current) { setMode('server'); await startServer(); }
        else { listeningIntentRef.current = false; setListening(false); setError(serverErrorMessage(language, 'speech_backend_unconfigured')); }
        return;
      }
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      let working = false, switching = false;
      const markWorking = () => {
        if (!mountedRef.current || recognitionRef.current !== recognition) return;
        working = true; clearTimer(); setBrowserWorking(true);
        rememberBrowserEngine(language, true);
      };
      const fallback = async (code: string) => {
        if (switching || !mountedRef.current || !listeningIntentRef.current || recognitionRef.current !== recognition) return;
        switching = true; clearTimer();
        rememberBrowserEngine(language, false);
        recognitionRef.current = null;
        try { recognition.abort?.(); } catch { /* already ended */ }
        setInterim(''); setBrowserWorking(false);
        const available = serverFallback && serverRecordingAvailable() && (serverAvailable || await capabilitiesReadyRef.current);
        if (!mountedRef.current || !listeningIntentRef.current) return;
        if (available) { setMode('server'); await startServer(); }
        else { listeningIntentRef.current = false; setListening(false); setError(serverFallback ? serverErrorMessage(language, 'speech_backend_unconfigured') : errorMessage(language, code)); }
      };
      recognition.onstart = () => mountedRef.current && setListening(true);
      recognition.onaudiostart = markWorking;
      const finalized = new Set<number>();
      recognition.onresult = (event: any) => {
        if (!mountedRef.current || recognitionRef.current !== recognition) return;
        markWorking();
        let live = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = String(result?.[0]?.transcript ?? '');
          if (result.isFinal && !finalized.has(i)) {
            finalized.add(i);
            const processed = postProcessDictation(transcript, { language, nepaliDigits: language === 'ne-NP' });
            if (processed) onFinalRef.current?.(`${processed} `);
          } else if (!result.isFinal) live += `${transcript} `;
        }
        setInterim(live.trimStart());
      };
      recognition.onerror = (event: any) => {
        if (!mountedRef.current || recognitionRef.current !== recognition || !listeningIntentRef.current) return;
        const code = String(event?.error || 'unknown');
        if (['network', 'service-not-allowed', 'language-not-supported'].includes(code)) { void fallback(code); return; }
        listeningIntentRef.current = false; clearTimer(); setListening(false); setInterim(''); setError(errorMessage(language, code));
      };
      recognition.onend = () => {
        if (!mountedRef.current || recognitionRef.current !== recognition) return;
        if (!working && listeningIntentRef.current) { void fallback('audio-start-timeout'); return; }
        recognitionRef.current = null; clearTimer(); setListening(false); setInterim('');
      };
      recognitionRef.current = recognition;
      setListening(true);
      timerRef.current = window.setTimeout(() => { if (!working) void fallback('audio-start-timeout'); }, 3_000);
      try { recognition.start(); }
      catch (cause) {
        if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
          listeningIntentRef.current = false; recognitionRef.current = null; clearTimer(); setListening(false); setError(errorMessage(language, 'not-allowed'));
        } else await fallback('start-failed');
      }
      return;
    }
    listeningIntentRef.current = false;
    setError(language === 'ne-NP'
      ? 'यो ब्राउजरमा आवाज टाइपिङ उपलब्ध छैन। Chrome/Edge वा MediaRecorder समर्थित ब्राउजर प्रयोग गर्नुहोस्।'
      : 'Voice typing is not available in this browser. Try Chrome/Edge or a browser with MediaRecorder support.');
  }, [clearTimer, language, listening, mode, processing, serverAvailable, serverFallback, startServer]);

  return {
    mode,
    browserAvailable,
    browserWorking,
    serverAvailable,
    capabilitiesChecked,
    listening,
    processing,
    interim,
    error,
    language,
    selectMode,
    start,
    stop,
  };
}
