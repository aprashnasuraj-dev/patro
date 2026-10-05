'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechLanguage = 'ne-NP' | 'en-US';

export function detectSpeechLanguage(text: string): SpeechLanguage {
  let devanagari = 0;
  let latin = 0;
  for (const char of text) {
    if (char >= '\u0900' && char <= '\u097f') devanagari += 1;
    else if (/[A-Za-z]/.test(char)) latin += 1;
  }
  if (devanagari >= 2 && devanagari >= latin * 0.35) return 'ne-NP';
  return devanagari >= Math.max(1, latin) ? 'ne-NP' : 'en-US';
}

export function splitForSpeech(text: string, max = 180): string[] {
  if (max < 8) max = 8;
  const normalized = text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?:\n+|(?<=[।?!॥])\s+)/).filter(Boolean);
  const output: string[] = [];

  const pushToken = (token: string) => {
    let rest = token.trim();
    while (rest.length > max) {
      output.push(rest.slice(0, max));
      rest = rest.slice(max);
    }
    if (rest) output.push(rest);
  };

  for (const sentence of sentences) {
    const part = sentence.trim();
    if (!part) continue;
    if (part.length <= max) {
      output.push(part);
      continue;
    }

    let buffer = '';
    for (const token of part.split(/\s+/)) {
      if (!buffer && token.length > max) {
        pushToken(token);
        continue;
      }
      const next = buffer ? `${buffer} ${token}` : token;
      if (next.length > max && buffer) {
        output.push(buffer);
        buffer = token;
      } else {
        buffer = next;
      }
    }
    if (buffer) {
      if (buffer.length > max) pushToken(buffer);
      else output.push(buffer);
    }
  }
  return output;
}

function voiceScore(voice: SpeechSynthesisVoice, language: SpeechLanguage) {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  if (language === 'en-US') {
    if (lang === 'en-us') return 100;
    if (lang.startsWith('en-us')) return 95;
    if (lang.startsWith('en')) return 80;
    return 0;
  }

  if (lang === 'ne-np') return 120;
  if (lang.startsWith('ne')) return 110;
  if (/nepali|नेपाली|hemkala|sagar|chitwan/.test(name)) return 105;
  if (lang === 'hi-in') return 70;
  if (lang.startsWith('hi')) return 60;
  return 0;
}

export function pickSpeechVoice(
  voices: SpeechSynthesisVoice[],
  language: SpeechLanguage = 'ne-NP',
): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;
  for (const candidate of voices) {
    const score = voiceScore(candidate, language);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export function useNepaliSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const refreshVoice = useCallback(() => {
    if (!supported) return;
    setVoice(pickSpeechVoice(window.speechSynthesis.getVoices(), 'ne-NP'));
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    refreshVoice();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoice);
    const delayed = window.setTimeout(refreshVoice, 250);
    return () => {
      window.clearTimeout(delayed);
      window.speechSynthesis.removeEventListener('voiceschanged', refreshVoice);
    };
  }, [refreshVoice, supported]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    utteranceRef.current = null;
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback((rawText: string, opts: { rate?: number } = {}) => {
    const text = rawText.normalize('NFC').trim();
    stop();
    setError(null);
    if (!text) return;
    if (!supported) {
      setError('यो उपकरणमा text-to-speech उपलब्ध छैन।');
      return;
    }

    const chunks = splitForSpeech(text);
    if (!chunks.length) return;
    const run = ++generationRef.current;
    const rate = Math.min(1.5, Math.max(0.55, opts.rate ?? 0.9));
    setSpeaking(true);

    const speakChunk = (index: number) => {
      if (run !== generationRef.current) return;
      if (index >= chunks.length) {
        utteranceRef.current = null;
        setSpeaking(false);
        return;
      }

      const chunk = chunks[index];
      const language = detectSpeechLanguage(chunk);
      const selected = pickSpeechVoice(window.speechSynthesis.getVoices(), language);
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = selected?.lang || language;
      if (selected) utterance.voice = selected;
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => speakChunk(index + 1);
      utterance.onerror = (event: any) => {
        if (run !== generationRef.current) return;
        const reason = String(event?.error || 'speech_error');
        if (reason !== 'canceled' && reason !== 'interrupted') {
          setError(`पढेर सुनाउन सकिएन (${reason})।`);
        }
        utteranceRef.current = null;
        setSpeaking(false);
      };
      utteranceRef.current = utterance;
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    };

    speakChunk(0);
  }, [stop, supported]);

  return {
    speak,
    stop,
    speaking,
    error,
    supported,
    voiceName: voice?.name || null,
    voiceLanguage: voice?.lang || null,
    hasNepaliVoice: !!voice?.lang.toLowerCase().startsWith('ne') || !!voice && /nepali|नेपाली|hemkala|sagar|chitwan/i.test(voice.name),
  };
}
