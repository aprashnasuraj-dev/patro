'use client';
/**
 * Read-aloud for elders ("सुन्नुहोस्" button on any text).
 *
 * 1. Browser voice ne-NP if installed (rare), else hi-IN (reads Devanagari
 *    acceptably), else server fallback /api/nepali/tts (Azure neural ne-NP voices).
 * 2. Text is split at । ? ! so long notices don't get cut off (Chrome stops
 *    utterances after ~15 s on some devices).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function splitForSpeech(text: string, max = 180): string[] {
  const parts = text.replace(/\s+/g, ' ').split(/(?<=[।?!॥\n])\s*/);
  const out: string[] = [];
  for (const p of parts) {
    if (p.length <= max) { if (p.trim()) out.push(p.trim()); continue; }
    let buf = '';
    for (const w of p.split(/(?<=,)\s*|\s+/)) {
      if ((buf + ' ' + w).length > max && buf) { out.push(buf.trim()); buf = ''; }
      buf += ' ' + w;
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'ne-NP') ||
    voices.find((v) => v.lang.startsWith('ne')) ||
    voices.find((v) => v.lang === 'hi-IN') ||
    voices.find((v) => v.lang.startsWith('hi')) ||
    null
  );
}

export function useNepaliSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => setVoice(pickVoice());
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    audioRef.current?.pause();
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, opts: { rate?: number; preferServer?: boolean } = {}) => {
    stop();
    setSpeaking(true);
    const useServer = opts.preferServer || !voice || !voice.lang.startsWith('ne');
    if (useServer) {
      try {
        const res = await fetch('/api/nepali/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, rate: opts.rate ?? 0.9 }) });
        if (res.ok) {
          const audio = new Audio(URL.createObjectURL(await res.blob()));
          audioRef.current = audio;
          audio.onended = () => setSpeaking(false);
          await audio.play();
          return;
        }
      } catch { /* fall through to browser voice */ }
    }
    if (!('speechSynthesis' in window)) { setSpeaking(false); return; }
    const chunks = splitForSpeech(text);
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c);
      u.lang = voice?.lang ?? 'hi-IN';
      if (voice) u.voice = voice;
      u.rate = opts.rate ?? 0.9;
      if (i === chunks.length - 1) u.onend = () => setSpeaking(false);
      speechSynthesis.speak(u);
    });
  }, [voice, stop]);

  return { speak, stop, speaking, hasNepaliVoice: !!voice?.lang.startsWith('ne') };
}
