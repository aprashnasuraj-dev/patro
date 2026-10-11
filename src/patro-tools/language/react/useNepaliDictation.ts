'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalize } from '../spellcheck';
import { toNepaliDigits } from '../../core/names';
import { installLocalSpeech, localSpeechStatus, type LocalSpeechStatus } from '../voice-local';
import { convertSpokenNepaliNumbers, repairNepaliCopula } from '../voice-numbers';
import { speechError as errorMessage } from '../voice-guidance';
import { VoiceResultDiff } from '../voice-results';

export type DictationLanguage = 'ne-NP' | 'en-US';
export type DictationMode = 'browser' | 'server' | 'unsupported';

const NEPALI_SPOKEN: [RegExp, string][] = [
  [/\s*(?:पूर्ण\s*विराम|फुल\s*स्टप)/g, '।'],
  [/\s*(?:अल्प\s*विराम|कमा)/g, ','],
  [/\s*प्रश्नवाचक(?: चिन्ह)?|\s*प्रश्न\s*(?:चिन्ह|चिह्न)/g, '?'],
  [/\s*उद्गार(?: चिन्ह)?/g, '!'],
  [/\s*नयाँ (?:लाइन|हरफ|अनुच्छेद)\s*/g, '\n'],
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
  opts: { nepaliDigits?: boolean; language?: DictationLanguage; spokenNumbers?: boolean; transliterateLatin?: (text: string) => string } = {},
) {
  const language = opts.language ?? 'ne-NP';
  if (language === 'en-US') return postProcessEnglishDictation(raw);
  let text = repairNepaliCopula(raw.normalize('NFC'));
  for (const [pattern, symbol] of NEPALI_SPOKEN) text = text.replace(pattern, symbol);
  if (opts.spokenNumbers) text = convertSpokenNepaliNumbers(text);
  if (opts.transliterateLatin) text = text.split(/(https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/).map((part, i) => i % 2 ? part : part.replace(/[A-Za-z~]+/g, opts.transliterateLatin!)).join('');
  if (opts.nepaliDigits ?? true) text = toNepaliDigits(text);
  return normalize(text).text;
}


function speechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useNepaliDictation({
  onFinal, language = 'ne-NP', spokenNumbers = false, transliterateLatin,
}: {
  onFinal?: (text: string) => void;
  serverFallback?: boolean; // Retain caller compatibility; server recording is disabled.
  language?: DictationLanguage;
  spokenNumbers?: boolean;
  transliterateLatin?: (text: string) => string;
} = {}) {
  const [mode, setMode] = useState<DictationMode>('unsupported');
  const [browserAvailable, setBrowserAvailable] = useState(false);
  const [browserWorking, setBrowserWorking] = useState(false);
  const [browserFailure, setBrowserFailure] = useState<string | null>(null);
  const [capabilitiesChecked, setCapabilitiesChecked] = useState(false);
  const [localStatus, setLocalStatus] = useState<LocalSpeechStatus>('unavailable');
  const [localEnabled, setLocalEnabled] = useState(false);
  const [localInstalling, setLocalInstalling] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const localControllerRef = useRef<AbortController | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const listeningIntentRef = useRef(false);
  const previousLanguageRef = useRef(language);
  const [restartLanguage, setRestartLanguage] = useState<DictationLanguage | null>(null);
  const onFinalRef = useRef(onFinal);
  const cleanupRef = useRef({ spokenNumbers, transliterateLatin });
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { cleanupRef.current = { spokenNumbers, transliterateLatin }; }, [spokenNumbers, transliterateLatin]);

  const clearTimers = useCallback(() => {
    for (const ref of [startTimerRef, restartTimerRef, sessionTimerRef]) {
      if (ref.current !== null) window.clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      listeningIntentRef.current = false;
      clearTimers();
      localControllerRef.current?.abort();
      try { recognitionRef.current?.abort?.(); } catch { /* closed */ }
      recognitionRef.current = null;
    };
  }, [clearTimers]);

  useEffect(() => {
    const available = !!speechRecognitionCtor();
    setBrowserAvailable(available);
    setMode(available ? 'browser' : 'unsupported');
    setCapabilitiesChecked(true);
    const controller = new AbortController();
    localControllerRef.current?.abort();
    localControllerRef.current = controller;
    setLocalStatus('unavailable');
    setLocalEnabled(false);
    setLocalInstalling(false);
    if (available) {
      void localSpeechStatus(speechRecognitionCtor(), language, 10_000, controller.signal).then(status => {
        if (mountedRef.current && !controller.signal.aborted) setLocalStatus(status);
      });
    }
    return () => controller.abort();
  }, [language]);

  const stop = useCallback(() => {
    listeningIntentRef.current = false;
    setRestartLanguage(null);
    clearTimers();
    setInterim('');
    setListening(false);
    setBrowserWorking(false);
    try { recognitionRef.current?.stop?.(); } catch { /* closed */ }
  }, [clearTimers]);

  const selectMode = useCallback((next: Exclude<DictationMode, 'unsupported'>) => {
    if (next !== 'browser' || listening) return;
    const available = !!speechRecognitionCtor();
    setBrowserAvailable(available);
    setMode(available ? 'browser' : 'unsupported');
  }, [listening]);

  const selectLocalRecognition = useCallback((enabled: boolean) => {
    if (listening || (enabled && localStatus !== 'available')) return;
    setLocalEnabled(enabled);
    setMode(speechRecognitionCtor() ? 'browser' : 'unsupported');
  }, [listening, localStatus]);

  const installLocalRecognition = useCallback(async () => {
    if (localInstalling || listening) return;
    const controller = localControllerRef.current;
    setLocalInstalling(true);
    try {
      const next = await installLocalSpeech(speechRecognitionCtor(), language, 60_000, controller?.signal);
      if (!mountedRef.current || controller?.signal.aborted) return;
      setLocalStatus(next);
      if (next !== 'available') setError(language === 'ne-NP'
        ? 'अफलाइन आवाज डाउनलोड भएन। Live Browser recognition प्रयोग गर्नुहोस्।'
        : 'On-device speech could not be installed. Use Live Browser recognition.');
    } finally {
      if (mountedRef.current && !controller?.signal.aborted) setLocalInstalling(false);
    }
  }, [language, listening, localInstalling]);

  const start = useCallback(async () => {
    if (listening || listeningIntentRef.current) return;
    const SR = speechRecognitionCtor();
    if (!SR) {
      setMode('unsupported');
      setBrowserAvailable(false);
      setError(errorMessage(language, 'unsupported'));
      return;
    }
    let recognition: any;
    try { recognition = new SR(); }
    catch { setError(errorMessage(language, 'unsupported')); return; }
    listeningIntentRef.current = true;
    recognitionRef.current = recognition;
    setMode('browser');
    setListening(true);
    setError(null);
    setInterim('');
    setBrowserWorking(false);
    setBrowserFailure(null);
    const android = /Android/i.test(navigator.userAgent);
    const diff = new VoiceResultDiff();
    let working = false, stopped = false, silentRestarts = 0, restartDelay = 350;
    const finish = (code?: string) => {
      if (stopped || recognitionRef.current !== recognition) return;
      stopped = true;
      listeningIntentRef.current = false;
      clearTimers();
      recognitionRef.current = null;
      if (mountedRef.current) {
        setListening(false); setBrowserWorking(false); setInterim('');
        if (code) { setBrowserFailure(code); setError(errorMessage(language, code)); }
      }
      if (code) { try { recognition.abort?.(); } catch { /* ignored */ } }
    };
    const markWorking = () => {
      if (!mountedRef.current || !listeningIntentRef.current || recognitionRef.current !== recognition) return;
      working = true; silentRestarts = 0;
      if (startTimerRef.current !== null) { window.clearTimeout(startTimerRef.current); startTimerRef.current = null; }
      setBrowserWorking(true);
    };
    const armWatchdog = () => {
      if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
      // A real microphone permission prompt can take longer than the old 3 seconds.
      startTimerRef.current = window.setTimeout(() => {
        if (!working && listeningIntentRef.current) finish('audio-start-timeout');
      }, 15_000);
    };
    recognition.lang = language;
    recognition.processLocally = localEnabled && localStatus === 'available';
    recognition.continuous = !android;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (mountedRef.current && listeningIntentRef.current) setListening(true);
    };
    recognition.onaudiostart = markWorking;
    recognition.onspeechstart = markWorking;
    recognition.onresult = (event: any) => {
      if (!mountedRef.current || recognitionRef.current !== recognition) return;
      markWorking();
      const delta = diff.final(event.results);
      const processed = postProcessDictation(delta, { ...cleanupRef.current, language, nepaliDigits: language === 'ne-NP' });
      if (processed) onFinalRef.current?.(processed + ' ');
      const live: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        if (!event.results[i]?.isFinal) live.push(String(event.results[i]?.[0]?.transcript || ''));
      }
      setInterim(live.join(' ').trimStart());
    };
    recognition.onerror = (event: any) => {
      if (!mountedRef.current || !listeningIntentRef.current || recognitionRef.current !== recognition) return;
      const code = String(event?.error || 'unknown');
      if (code === 'aborted' || (android && code === 'no-speech')) return;
      finish(code);
    };
    recognition.onend = () => {
      if (!mountedRef.current || recognitionRef.current !== recognition) return;
      if (!listeningIntentRef.current) { finish(); return; }
      setInterim('');
      if (!android) { finish(); return; }
      if (!working && ++silentRestarts > 3) { finish('no-speech'); return; }
      if (working) silentRestarts = 0;
      working = false;
      setBrowserWorking(false);
      if (startTimerRef.current !== null) { window.clearTimeout(startTimerRef.current); startTimerRef.current = null; }
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (!mountedRef.current || !listeningIntentRef.current || recognitionRef.current !== recognition) return;
        diff.restart();
        try { recognition.start(); armWatchdog(); }
        catch { finish('restart-failed'); }
      }, restartDelay);
      restartDelay = Math.min(2000, restartDelay * 2);
    };
    if (android) sessionTimerRef.current = window.setTimeout(() => finish('session-limit'), 10 * 60_000);
    try { recognition.start(); armWatchdog(); }
    catch (cause) {
      finish(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'not-allowed' : 'start-failed');
    }
  }, [language, listening, localEnabled, localStatus, clearTimers]);

  useEffect(() => {
    if (previousLanguageRef.current === language) return;
    previousLanguageRef.current = language;
    const resume = listeningIntentRef.current;
    stop();
    if (resume) setRestartLanguage(language);
  }, [language, stop]);

  useEffect(() => {
    if (restartLanguage !== language || !capabilitiesChecked) return;
    setRestartLanguage(null);
    if (mode === 'browser') void start();
  }, [restartLanguage, language, capabilitiesChecked, mode, start]);

  return {
    mode, browserAvailable, browserWorking, browserFailure, localStatus, localEnabled,
    localInstalling, installLocalRecognition, selectLocalRecognition,
    serverAvailable: false, capabilitiesChecked, listening,
    processing: false, progress: { completed: 0, pending: 0, elapsedSeconds: 0 },
    interim, error, language, selectMode, start, stop,
  };
}
