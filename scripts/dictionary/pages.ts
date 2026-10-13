/**
 * Which dictionary URLs exist — shared by sitemap.ts (before `vite build`) and
 * prerender.ts (after it), so the sitemap and the deployed pages can never disagree.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DICT_BASE_PATH, LEVELS, englishFromSlug, englishSlug, wordPath, type Compiled, type Proverb } from '../../src/lib/dictionary-core/index.ts';

export const ROOT = process.cwd();
export const cfg = JSON.parse(readFileSync(join(ROOT, 'data/dictionary/config.json'), 'utf8'));
export const site = { origin: String(process.env.PUBLIC_SITE_URL || cfg.origin).replace(/\/$/, ''), siteName: cfg.siteName, dictName: cfg.dictName, ogImage: cfg.ogImage };
export const STATIC_DIR = join(ROOT, cfg.staticOut);
export const PAGE_SIZE = 200;

/** Percent-encode each segment (Devanagari slugs) — what crawlers and sitemaps should see. */
export const encPath = (p: string) => p.split('/').map((s) => encodeURIComponent(s)).join('/');

export function loadBuild() {
  const f = join(ROOT, cfg.buildOut, 'compiled.json');
  if (!existsSync(f)) throw new Error(`${f} missing — run scripts/dictionary/build-dictionary.ts first`);
  const data = JSON.parse(readFileSync(f, 'utf8')) as { compiled: Compiled[]; proverbs: Proverb[]; rhymeCounts: Record<string, number>; rhymePageSlugs: string[] };
  const lf = join(ROOT, cfg.buildOut, 'learning.json');
  const learning = existsSync(lf)
    ? (JSON.parse(readFileSync(lf, 'utf8')) as { enPrerender: string[]; enIndex: Record<string, Array<{ s: string; l: string; r: string; p: string; d: string; g: string }>> })
    : { enPrerender: [], enIndex: {} };
  return { ...data, learning };
}

export type Build = ReturnType<typeof loadBuild>;

export function plan(b: Build) {
  const defined = b.compiled.filter((c) => c.entry.senses.length).sort((a, c) => (a.entry.freq ?? 1e9) - (c.entry.freq ?? 1e9));
  const byInitial = new Map<string, Compiled[]>();
  for (const c of defined) {
    const ch = [...c.entry.lemma][0];
    (byInitial.get(ch) ?? byInitial.set(ch, []).get(ch)!).push(c);
  }
  const initials = [...byInitial.keys()].sort((a, c) => a.localeCompare(c, 'ne'));
  const browse = initials.flatMap((ch) => {
    const list = byInitial.get(ch)!.sort((a, c) => a.entry.lemma.localeCompare(c.entry.lemma, 'ne'));
    const pages = Math.ceil(list.length / PAGE_SIZE);
    return Array.from({ length: pages }, (_, i) => ({
      ch, page: i + 1, pages, total: list.length,
      path: `${DICT_BASE_PATH}/akshar/${ch}${i ? `/${i + 1}` : ''}`,
      items: list.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE),
    }));
  });
  const rhymeSet = new Set(b.rhymePageSlugs ?? []);
  const rhymes = defined.filter((c) => rhymeSet.has(c.keys.slug));
  // English pages are rendered by the Worker; list the most useful ones in the sitemap.
  const enTop = cfg.english?.sitemapTop ?? 3000;
  const english = b.learning.enPrerender
    .filter((k) => b.learning.enIndex[k]?.length && /^[a-z' ]+$/.test(k) && englishFromSlug(englishSlug(k)) === k)
    .slice(0, enTop);
  const lists = ['ne', 'en'].flatMap((lang) => LEVELS.filter((l) => l.id !== 'C1').map((L) => ({ id: `${lang}-${L.id}`, lang: lang as 'ne' | 'en', level: L })))
    .filter((l) => existsSync(join(STATIC_DIR, 'learn', `${l.id}.json`)));
  return {
    defined, initials, browse, rhymes, english, lists,
    fixed: ['', '/ukhan', '/en', '/sikau', '/pariksha', '/shuddha'].map((p) => DICT_BASE_PATH + p),
    wordPaths: defined.map((c) => ({ path: wordPath(c.keys.slug), lastmod: c.entry.updatedAt })),
  };
}
