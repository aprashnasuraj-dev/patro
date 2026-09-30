'use client';
/** Remembers the viewer's preferred script (देवनागरी / 𑐣𑐾𑐥𑐵𑐮 / Roman). */
import { useCallback, useEffect, useState } from 'react';
import type { Script } from '../engine';

const KEY = 'ns-script';
export function useNsScript(initial: Script = 'dev') {
  const [script, setScript] = useState<Script>(initial);
  useEffect(() => {
    try { const v = localStorage.getItem(KEY) as Script | null; if (v) setScript(v); } catch { /* private mode */ }
  }, []);
  const set = useCallback((s: Script) => { setScript(s); try { localStorage.setItem(KEY, s); } catch { /* ignore */ } }, []);
  return [script, set] as const;
}

export function ScriptToggle({ value, onChange }: { value: Script; onChange: (s: Script) => void }) {
  const opts: [Script, string][] = [['dev', 'देवनागरी'], ['newa', '𑐣𑐾𑐥𑐵𑐮 𑐮𑐶𑐥𑐶'], ['roman', 'Roman']];
  return (
    <div role="radiogroup" aria-label="लिपि" style={{ display: 'inline-flex', gap: 4 }}>
      {opts.map(([k, label]) => (
        <button key={k} role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid currentColor', opacity: value === k ? 1 : 0.55, fontFamily: k === 'newa' ? '"Noto Sans Newa", sans-serif' : undefined }}>
          {label}
        </button>
      ))}
    </div>
  );
}
