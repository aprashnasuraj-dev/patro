'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { normalize } from '../spellcheck';
import { toNepaliDigits } from '../../core/names';
import { recordVoiceChunks, type ChunkedRecording, type RecordingProgress } from '../voice-chunks';
import { installLocalSpeech, localSpeechStatus, type LocalSpeechStatus } from '../voice-local';
import { convertSpokenNepaliNumbers, repairNepaliCopula } from '../voice-numbers';
import { speechError as errorMessage } from '../voice-guidance';
import { VoiceResultDiff } from '../voice-results';
import { browserEngineHint, rememberBrowserEngine } from '../voice-engine';

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

function serverErrorMessage(language: DictationLanguage, code: string) {
  const nepali = language === 'ne-NP';
  if (code === 'speech_backend_unconfigured') {
    return nepali
      ? 'Server आवाज सेवा उपलब्ध भएन। अर्को ब्राउजर वा केही समयपछि प्रयास गर्नुहोस्।'
      : 'Server speech is unavailable. Try another browser or try again later.';
  }
  if (code === 'speech_rate_limited') return nepali ? 'आवाज सेवाको सीमा पुग्यो। केही समयपछि फेरि प्रयास गर्नुहोस्।' : 'Speech service limit reached. Please retry later.';
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
  spokenNumbers = false,
  transliterateLatin,
}: {
  onFinal?: (text: string) => void;
  serverFallback?: boolean;
  language?: DictationLanguage;
  spokenNumbers?: boolean;
  transliterateLatin?: (text: string) => string;
} = {}) {
  const [mode, setMode] = useState<DictationMode>('unsupported');
  const [browserWorking, setBrowserWorking] = useState(false);
  const [browserFailure, setBrowserFailure] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<LocalSpeechStatus>('unavailable');
  const [localEnabled, setLocalEnabled] = useState(false);
  const [localInstalling, setLocalInstalling] = useState(false);
  const localControllerRef = useRef<AbortController | null>(null);
  const [browserAvailable, setBrowserAvailable] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [capabilitiesChecked, setCapabilitiesChecked] = useState(false);
  const [listening, setListening] = useState(false);
  const [recordingEnded, setRecordingEnded] = useState(0);
  const selectedModeRef = useRef<DictationMode>('browser');
  const [restartLanguage, setRestartLanguage] = useState<DictationLanguage | null>(null);
  const previousLanguageRef = useRef(language);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<RecordingProgress>({ completed: 0, pending: 0, elapsedSeconds: 0 });
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<ChunkedRecording | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const listeningIntentRef = useRef(false);
  const capabilitiesReadyRef = useRef<Promise<boolean>>(Promise.resolve(false));
  const onFinalRef = useRef(onFinal);
  const cleanupRef = useRef({ spokenNumbers, transliterateLatin });
  useEffect(() => { cleanupRef.current = { spokenNumbers, transliterateLatin }; }, [spokenNumbers, transliterateLatin]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearSessionTimers = useCallback(() => {
    for (const ref of [restartTimerRef, sessionTimerRef]) { if (ref.current !== null) window.clearTimeout(ref.current); ref.current = null; }
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
      clearSessionTimers();
      clearTimer();
      try { recognitionRef.current?.abort?.(); } catch { /* already ended */ }
      recordingRef.current?.cancel();
      localControllerRef.current?.abort();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearTimer, clearSessionTimers]);

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
        if (server && (!browser || browserEngineHint(language) === false || selectedModeRef.current === 'server')) setMode('server');
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

  useEffect(() => {
    const controller = new AbortController();
    localControllerRef.current?.abort(); localControllerRef.current = controller;
    setLocalEnabled(false); setLocalInstalling(false); setLocalStatus('unavailable');
    void localSpeechStatus(speechRecognitionCtor(), language, 10_000, controller.signal).then(status => {
      if (mountedRef.current && !controller.signal.aborted) setLocalStatus(status);
    });
    return () => controller.abort();
  }, [language]);

  const installLocalRecognition = useCallback(async () => {
    if (localInstalling || listening || processing) return;
    const controller = localControllerRef.current;
    setLocalInstalling(true);
    const status = await installLocalSpeech(speechRecognitionCtor(), language, 60_000, controller?.signal);
    if (mountedRef.current && !controller?.signal.aborted) {
      setLocalStatus(status); setLocalInstalling(false);
      if (status !== 'available') setError(language === 'ne-NP' ? 'अफलाइन आवाज डाउनलोड पूरा भएन। Live वा server mode प्रयोग गर्नुहोस्।' : 'Offline speech download did not finish. Use live or server mode.');
    }
  }, [language, listening, localInstalling, processing]);

  const selectLocalRecognition = useCallback((enabled: boolean) => {
    if (listening || processing || (enabled && localStatus !== 'available')) return;
    setLocalEnabled(enabled);
    if (enabled) { selectedModeRef.current = 'browser'; setMode('browser'); }
  }, [listening, processing, localStatus]);

  const stop = useCallback(() => {
    setRestartLanguage(null);
    listeningIntentRef.current = false;
    setInterim('');
    clearSessionTimers();
    clearTimer();
    const recognition = recognitionRef.current;
    try { recognition?.stop?.(); } catch { /* already ended */ }

    if (recordingRef.current) recordingRef.current.stop();
    else stopTracks();
    setListening(false);
  }, [clearTimer, clearSessionTimers, stopTracks]);

  const selectMode = useCallback((next: Exclude<DictationMode, 'unsupported'>) => {
    if (listening || processing) return;
    if (next === 'browser' && browserAvailable) {
      setError(null);
      selectedModeRef.current = 'browser';
      setMode('browser');
      return;
    }
    if (next === 'server' && serverAvailable && serverRecordingAvailable()) {
      setError(null);
      selectedModeRef.current = 'server';
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
        setProgress({ completed: 0, pending: 0, elapsedSeconds: 0 });
        setListening(true);
        recordingRef.current = recordVoiceChunks({
          stream, mimeType,
          async transcribe(blob, signal) {
            const body = new FormData();
            body.append('audio', blob, 'speech'); body.append('language', language);
            const response = await fetch('/api/nepali/stt', { method: 'POST', body, signal });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(serverErrorMessage(language, String(payload?.error || `HTTP ${response.status}`)));
            return postProcessDictation(String(payload?.text ?? ''), { ...cleanupRef.current, language, nepaliDigits: language === 'ne-NP' });
          },
          onText(text) { if (mountedRef.current) onFinalRef.current?.(`${text} `); },
          onProgress(next) { if (mountedRef.current) { setProgress(next); setProcessing(next.pending > 0); } },
          onError(cause) {
            listeningIntentRef.current = false;
            if (mountedRef.current) { setListening(false); setError(cause instanceof Error ? cause.message : serverErrorMessage(language, 'recording-failed')); }
          },
          onEnd() {
            recordingRef.current = null; streamRef.current = null; listeningIntentRef.current = false;
            if (mountedRef.current) { setListening(false); setProcessing(false); setRecordingEnded(value => value + 1); }
          },
        });
      } catch (cause) {
        listeningIntentRef.current = false;
        stopTracks();
        setListening(false);
        setError(cause instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(cause.name) ? errorMessage(language, 'not-allowed') : cause instanceof Error ? cause.message : errorMessage(language, 'audio-capture'));
      }
      return;
  }, [capabilitiesChecked, clearTimer, language, serverAvailable, stopTracks]);

  const start = useCallback(async () => {
    if (processing || listening) return;
    listeningIntentRef.current = true;
    setError(null);
    setInterim('');
    setBrowserWorking(false);
    setBrowserFailure(null);

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
      recognition.processLocally = localEnabled && localStatus === 'available';
      const android = /Android/i.test(navigator.userAgent);
      recognition.continuous = !android;
      const diff = new VoiceResultDiff();
      let restartDelay = 250;
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
        switching = true; clearSessionTimers(); clearTimer();
        rememberBrowserEngine(language, false);
        setBrowserFailure(code);
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

      recognition.onresult = (event: any) => {
        if (!mountedRef.current || recognitionRef.current !== recognition) return;
        markWorking();
        restartDelay = 250;
        const delta = diff.final(event.results);
        const processed = postProcessDictation(delta, { ...cleanupRef.current, language, nepaliDigits: language === 'ne-NP' });
        if (processed) onFinalRef.current?.(`${processed} `);
        let live = '';
        for (let i = 0; i < event.results.length; i++) { if (!event.results[i].isFinal) live += `${event.results[i]?.[0]?.transcript ?? ''} `; }
        setInterim(live.trimStart());
      };
      recognition.onerror = (event: any) => {
        if (!mountedRef.current || recognitionRef.current !== recognition || !listeningIntentRef.current) return;
        const code = String(event?.error || 'unknown');
        if (android && code === 'no-speech') { working = true; return; }
        if (['network', 'service-not-allowed', 'language-not-supported'].includes(code)) { void fallback(code); return; }
        listeningIntentRef.current = false; clearSessionTimers(); clearTimer(); setListening(false); setInterim(''); setError(errorMessage(language, code));
      };
      recognition.onend = () => {
        if (!mountedRef.current || recognitionRef.current !== recognition) return;
        if (!working && listeningIntentRef.current) { void fallback('audio-start-timeout'); return; }
        clearTimer(); setInterim('');
        if (android && listeningIntentRef.current) {
          restartTimerRef.current = window.setTimeout(() => {
            restartTimerRef.current = null;
            if (!mountedRef.current || !listeningIntentRef.current || recognitionRef.current !== recognition) return;
            diff.restart(); working = false;
            timerRef.current = window.setTimeout(() => { if (!working) void fallback('audio-start-timeout'); }, 3_000);
            try { recognition.start(); } catch { void fallback('restart-failed'); }
          }, restartDelay);
          restartDelay = Math.min(2_000, restartDelay * 2);
          return;
        }
        recognitionRef.current = null; listeningIntentRef.current = false; clearSessionTimers(); setListening(false);
      };
      recognitionRef.current = recognition;
      if (android) sessionTimerRef.current = window.setTimeout(stop, 10 * 60_000);
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
  }, [clearTimer, clearSessionTimers, language, listening, localEnabled, localStatus, mode, processing, serverAvailable, serverFallback, startServer, stop]);

  useEffect(() => {
    if (previousLanguageRef.current === language) return;
    previousLanguageRef.current = language;
    const resume = listeningIntentRef.current || listening;
    stop();
    if (resume) setRestartLanguage(language);
  }, [language, listening, stop]);

  useEffect(() => {
    if (restartLanguage !== language || !capabilitiesChecked || processing || recordingRef.current) return;
    setRestartLanguage(null);
    if (mode !== 'unsupported') void start();
  }, [restartLanguage, language, capabilitiesChecked, processing, recordingEnded, mode, start]);

  return {
    mode,
    browserAvailable,
    browserWorking,
    browserFailure,
    localStatus,
    localEnabled,
    localInstalling,
    installLocalRecognition,
    selectLocalRecognition,
    serverAvailable,
    capabilitiesChecked,
    listening,
    processing,
    progress,
    interim,
    error,
    language,
    selectMode,
    start,
    stop,
  };
}
