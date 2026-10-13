/**
 * Shared assembly logic: validation, cross-linking, proverb↔word linking and
 * WordPayload construction. Used by the static build AND the Worker renderer,
 * so both backends produce byte-for-byte compatible payloads.
 */

import type { EntryKeys, EntryStatus, IndexRow, LexiconEntry, Proverb, RhymeHit, SourceRef, WordLink, WordPayload } from './types.ts';
import { cleanLemma, devKey, hasDevanagari } from './normalize.ts';
import { computeKeys } from './keys.ts';
import { stemCandidates } from './query.ts';
import { generateForms, type MorphRules } from './morph.ts';

export interface Compiled {
  entry: LexiconEntry;
  keys: EntryKeys;
}

export interface ValidationIssue {
  level: 'error' | 'warn' | 'info';
  lemma: string;
  msg: string;
}

const STATUS_RANK: Record<EntryStatus, number> = { stub: 0, draft: 1, reviewed: 2, published: 3 };

/**
 * Merge entries from several sources by lemma (+homograph). Later lists win:
 * their senses come FIRST (curated/editorial definitions lead), arrays are unioned,
 * scalars are overridden, status is the "most published" of the two.
 */
export function mergeEntries(lists: LexiconEntry[][], modes: Array<'prepend' | 'replace'> = []): LexiconEntry[] {
  const out = new Map<string, LexiconEntry>();
  const key = (e: LexiconEntry) => `${cleanLemma(e.lemma)}#${e.homograph ?? 1}`;
  const uniq = <T>(a?: T[], b?: T[]) => {
    const r = [...new Set([...(a ?? []), ...(b ?? [])])];
    return r.length ? r : undefined;
  };
  lists.forEach((list, li) => {
    const replace = modes[li] === 'replace';
    for (const inc of list) {
      const k = key(inc);
      const cur = out.get(k);
      if (!cur) {
        out.set(k, { ...inc, lemma: cleanLemma(inc.lemma) });
        continue;
      }
      const seen = new Set(inc.senses.map((s) => s.ne));
      const kept = replace && inc.senses.length ? [] : cur.senses.filter((s) => !seen.has(s.ne));
      const senses = [...inc.senses, ...kept].map((s, i) => ({ ...s, id: `s${i + 1}` }));
      const status = [cur.status ?? 'reviewed', inc.status ?? 'reviewed'].sort((a, b) => STATUS_RANK[b] - STATUS_RANK[a])[0];
      out.set(k, {
        ...cur,
        ...Object.fromEntries(Object.entries(inc).filter(([, v]) => v !== undefined)),
        lemma: cur.lemma,
        senses,
        status: senses.length && status === 'stub' ? 'reviewed' : status,
        synonyms: uniq(inc.synonyms, cur.synonyms)?.filter((x) => x !== cur.lemma),
        antonyms: uniq(inc.antonyms, cur.antonyms),
        related: uniq(inc.related, cur.related),
        variants: uniq(inc.variants, cur.variants)?.filter((x) => x !== cur.lemma),
        romanAlt: uniq(inc.romanAlt, cur.romanAlt),
        categories: uniq(inc.categories, cur.categories),
        src: uniq(cur.src, inc.src),
        sources: uniq(cur.sources, inc.sources),
        inflection: inc.inflection ?? cur.inflection,
        freq: inc.freq ?? cur.freq,
        posHint: senses.length ? undefined : inc.posHint ?? cur.posHint,
      });
    }
  });
  return [...out.values()];
}

export function validateEntries(entries: LexiconEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const slugs = new Map<string, string>();
  let noGloss = 0;
  for (const e of entries) {
    const L = e.lemma ?? '(missing)';
    if (!e.lemma || !hasDevanagari(e.lemma)) issues.push({ level: 'error', lemma: L, msg: 'lemma must be Devanagari' });
    if (e.lemma && cleanLemma(e.lemma) !== e.lemma) issues.push({ level: 'warn', lemma: L, msg: 'lemma not normalized (NFC/zero-width/trailing danda) — will be cleaned' });
    if (!e.senses?.length && e.status !== 'stub') issues.push({ level: 'error', lemma: L, msg: 'at least one sense required (or status "stub")' });
    const ids = new Set<string>();
    for (const s of e.senses ?? []) {
      if (ids.has(s.id)) issues.push({ level: 'error', lemma: L, msg: `duplicate sense id ${s.id}` });
      ids.add(s.id);
      if (!s.ne?.trim()) issues.push({ level: 'error', lemma: L, msg: `sense ${s.id} has no Nepali definition` });
    }
    if (e.senses?.length && !e.senses.some((s) => s.en?.length)) noGloss++;
    if (e.lemma) {
      const k = computeKeys(e);
      const prev = slugs.get(k.slug);
      if (prev) issues.push({ level: 'error', lemma: L, msg: `slug "${k.slug}" collides with another entry — set "homograph": 2` });
      slugs.set(k.slug, L);
    }
    for (const s of e.synonyms ?? []) if (s === e.lemma) issues.push({ level: 'warn', lemma: L, msg: 'lists itself as synonym' });
  }
  if (noGloss) issues.push({ level: 'info', lemma: '*', msg: `${noGloss} defined entries have no English gloss yet (English search + "meaning in English" text skip them)` });
  return issues;
}

export function compileEntries(entries: LexiconEntry[], opts: { publishDrafts?: boolean } = {}): Compiled[] {
  return entries
    .filter((e) => opts.publishDrafts || (e.status ?? 'reviewed') !== 'draft')
    .map((raw) => {
      const entry: LexiconEntry = { ...raw, lemma: cleanLemma(raw.lemma) };
      return { entry, keys: computeKeys(entry) };
    });
}

/** lemma / devKey → slug resolver, preferring the most frequent entry on devKey clashes. */
export function makeResolver(compiled: Compiled[]) {
  const byLemma = new Map<string, string>();
  const byKey = new Map<string, { slug: string; freq: number }>();
  for (const c of compiled) {
    if (!c.entry.homograph || c.entry.homograph === 1) byLemma.set(c.entry.lemma, c.keys.slug);
    const f = c.entry.freq ?? 1e9;
    for (const form of [c.entry.lemma, ...(c.entry.variants ?? [])]) {
      const k = devKey(form);
      const prev = byKey.get(k);
      if (!prev || prev.freq > f) byKey.set(k, { slug: c.keys.slug, freq: f });
    }
  }
  return (lemma: string): string | null => byLemma.get(cleanLemma(lemma)) ?? byKey.get(devKey(lemma))?.slug ?? null;
}

export function linkWords(list: string[] | undefined, resolve: (l: string) => string | null): WordLink[] {
  return (list ?? []).map((lemma) => ({ lemma, slug: resolve(lemma) }));
}

/** Map proverb id → headword slugs it mentions (explicit `words` win, else token stemming). */
export function linkProverbs(proverbs: Proverb[], resolve: (l: string) => string | null): Map<string, string[]> {
  const bySlug = new Map<string, string[]>();
  for (const p of proverbs) {
    const found = new Set<string>();
    const tokens = p.words?.length ? p.words : p.text.split(/[\s,।!?]+/).filter(Boolean);
    for (const t of tokens) {
      for (const cand of stemCandidates(t)) {
        const slug = resolve(cand);
        if (slug) {
          found.add(slug);
          break;
        }
      }
    }
    for (const slug of found) {
      const arr = bySlug.get(slug) ?? [];
      arr.push(p.id);
      bySlug.set(slug, arr);
    }
  }
  return bySlug;
}

export const isStub = (e: LexiconEntry) => !e.senses.length;

export function indexRow(c: Compiled): IndexRow {
  const gloss = [...new Set(c.entry.senses.flatMap((s) => s.en ?? []))].slice(0, 4).join(', ');
  const row: IndexRow = [c.keys.slug, c.entry.lemma, c.keys.roman, c.keys.devKey, c.keys.romanKey, c.keys.looseKey, c.entry.freq ?? 0, gloss];
  const pos = c.entry.senses[0]?.pos ?? c.entry.posHint;
  if (isStub(c.entry)) {
    row.push(pos ?? '', c.entry.inflection ? `${c.entry.inflection.stem}/${c.entry.inflection.flags.join(',')}` : '', 1);
  } else if (pos) {
    row.push(pos);
  }
  return row;
}

/** Stub payload built from an index row (static mode: stubs have no word file). */
export function stubFromRow(r: IndexRow): LexiconEntry {
  const [stem, flags] = (r[9] ?? '').split('/');
  return {
    lemma: r[1],
    senses: [],
    status: 'stub',
    freq: r[6] || undefined,
    ...(r[8] ? { posHint: r[8] as LexiconEntry['posHint'] } : {}),
    ...(stem && flags ? { inflection: { stem, flags: flags.split(',') } } : {}),
  };
}

export function resolveCredits(e: LexiconEntry, registry: Record<string, SourceRef>): SourceRef[] {
  const out: SourceRef[] = [...(e.sources ?? [])];
  for (const k of e.src ?? []) if (registry[k] && !out.some((x) => x.name === registry[k].name)) out.push(registry[k]);
  if (!out.length && registry['patro-editorial']) out.push(registry['patro-editorial']);
  return out;
}

export function assemblePayload(
  c: Compiled,
  resolve: (l: string) => string | null,
  proverbs: Proverb[],
  rhymes: RhymeHit[],
  extra: { morph?: MorphRules; registry?: Record<string, SourceRef> } = {},
): WordPayload {
  const inf = c.entry.inflection;
  const forms = inf && extra.morph ? generateForms(inf.stem, inf.flags, extra.morph, 60).filter((f) => f !== c.entry.lemma) : [];
  const credits = extra.registry ? resolveCredits(c.entry, extra.registry) : c.entry.sources ?? [];
  return {
    ...(forms.length ? { forms } : {}),
    ...(credits.length ? { credits } : {}),
    entry: c.entry,
    keys: c.keys,
    links: {
      synonyms: linkWords(c.entry.synonyms, resolve),
      antonyms: linkWords(c.entry.antonyms, resolve),
      related: linkWords(c.entry.related, resolve),
      variants: c.entry.variants ?? [],
    },
    proverbs,
    rhymes,
  };
}
