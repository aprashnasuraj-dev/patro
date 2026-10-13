import { useEffect, useRef, useState } from 'react';
import type { HeadData } from '../../lib/dictionary-core/index.ts';
import siteConfig from '../../../data/dictionary/config.json';

export const SITE = {
  origin: siteConfig.origin.replace(/\/$/, ''),
  siteName: siteConfig.siteName,
  dictName: siteConfig.dictName,
  ogImage: siteConfig.ogImage,
};

/**
 * Keep <head> in sync during client-side navigation. The prerendered HTML already
 * has these tags for crawlers; this hook only matters after the SPA takes over.
 */
export function useDocumentHead(head: HeadData | null) {
  useEffect(() => {
    if (!head) return;
    document.title = head.title;
    setMeta('name', 'description', head.description);
    setMeta('name', 'robots', head.robots ?? 'index,follow');
    setMeta('property', 'og:title', head.title);
    setMeta('property', 'og:description', head.description);
    setMeta('property', 'og:url', head.canonical);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = head.canonical;
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    for (const j of head.jsonLd) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(j);
      document.head.appendChild(s);
    }
  }, [head]);
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let m = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!m) {
    m = document.createElement('meta');
    m.setAttribute(attr, key);
    document.head.appendChild(m);
  }
  m.content = value;
}

/**
 * Read the JSON the prerender script inlined (<script id="__DICT__">) exactly once,
 * and only if it belongs to the page we're rendering — so the first paint needs no fetch.
 */
let bootConsumed = false;
export function takeBootData<T>(match: (d: any) => boolean): T | null {
  if (bootConsumed || typeof document === 'undefined') return null;
  const el = document.getElementById('__DICT__');
  if (!el) return null;
  bootConsumed = true;
  try {
    const d = JSON.parse(el.textContent ?? 'null');
    el.remove();
    return match(d) ? (d as T) : null;
  } catch {
    return null;
  }
}

export function useDebounced<T>(value: T, ms = 150): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Async loader with stale-response protection. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], initial: T | null = null) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: Error | null }>({
    data: initial,
    loading: initial === null,
    error: null,
  });
  const skipFirst = useRef(initial !== null);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => alive && setState({ data, loading: false, error: null }),
      (error) => alive && setState({ data: null, loading: false, error }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** Nepali alphabet order for the A–Z bar (vowels, then consonants incl. क्ष त्र ज्ञ). */
export const NEPALI_INITIALS = [
  'अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ',
  'क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण',
  'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह',
];
