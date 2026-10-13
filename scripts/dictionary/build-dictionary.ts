/**
 * Compile the lexicon into static, CDN-cacheable JSON for the SPA.
 *
 *   node scripts/dictionary/build-dictionary.ts            # uses data/dictionary/config.json
 *   node scripts/dictionary/build-dictionary.ts --strict   # fail on warnings too
 *
 * Output (config.staticOut, default public/data/dict/v1/ — Vite copies public/ into dist/):
 *   manifest.json            counts, version, build time
 *   w/<hash>.json            one WordPayload per headword (hash = FNV-1a of slug)
 *   idx/top.json             most frequent rows (instant suggestions, cross-bucket fuzzy)
 *   idx/l-<a-z>.json         rows bucketed by first Latin letter of romanKey
 *   idx/d-<hex>.json         rows bucketed by first Devanagari char of devKey
 *   idx/en-<a-z>.json        rows bucketed by first letter of each English gloss word
 *   r/s-<hash>.json          rhyme rows sharing a `single` key;  r/l-<hash>.json → `slant`
 *   ukhan.json, wotd.json
 * Plus config.buildOut/compiled.json for the sitemap + prerender scripts.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { devBucket, latinBucket } from '../../src/features/dictionary/client/buckets.ts';
import {
  NE_MORPH, assemblePayload, compileEntries, findRhymes, indexRow, rhymeShardKey, rhymeShardPath, wordShardPath, isStub, linkProverbs, makeResolver, mergeEntries, validateEntries,
  type Compiled, type IndexRow, type LexiconEntry, type Proverb, type SourceRef, type WotdConfig,
} from '../../src/lib/dictionary-core/index.ts';
import { packRhyme, type RhymeRow } from '../../src/lib/dictionary-core/rhyme.ts';

const ROOT = process.cwd();
const cfg = JSON.parse(readFileSync(join(ROOT, 'data/dictionary/config.json'), 'utf8'));
const strict = process.argv.includes('--strict');
const TOP_N = 2000;
const RHYME_PREVIEW = 24;

const readJson = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const out = (rel: string, data: unknown) => {
  const p = join(ROOT, cfg.staticOut, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
};

// 1. Load + validate ------------------------------------------------------
// Sources are merged in order; later files win (see mergeEntries). Typical order:
//   lexicon.open.json (imported)  →  lexicon.editorial.json (TSV)  →  lexicon.curated.json (hand-edited)
const files = cfg.sources.map((s: string) => readJson(s));
const registry: Record<string, SourceRef> = Object.assign({}, ...files.map((f: any) => f.sourceRegistry ?? {}), cfg.sourceRegistry ?? {});
// A file may declare "mergeMode": "replace" (its senses replace earlier ones — use for hand-curated
// entries) or default "prepend" (its senses go first, earlier senses kept after them).
// Gloss overlays (English for imported senses) apply to every file listed BEFORE the one declaring them.
files.forEach((f: any, i: number) => {
  if (!f.glossOverlay) return;
  let applied = 0;
  for (const prev of files.slice(0, i)) {
    for (const e of prev.entries as LexiconEntry[]) {
      const o = f.glossOverlay[e.lemma];
      if (!o) continue;
      for (const s of e.senses) if (o[s.id] && !s.en?.length) (s.en = o[s.id]), applied++;
    }
  }
  console.log(`  gloss overlay: ${applied} senses given English glosses`);
});
const raw: LexiconEntry[] = mergeEntries(files.map((f: any) => f.entries as LexiconEntry[]), files.map((f: any) => f.mergeMode ?? 'prepend'));
const proverbs: Proverb[] = cfg.proverbs ? readJson(cfg.proverbs).proverbs : [];
const wotd: WotdConfig = cfg.wotd ? readJson(cfg.wotd) : { pool: [] };

const issues = validateEntries(raw);
for (const i of issues) console[i.level === 'error' ? 'error' : i.level === 'info' ? 'log' : 'warn'](`[${i.level}] ${i.lemma}: ${i.msg}`);
const errors = issues.filter((i) => i.level === 'error').length;
if (errors || (strict && issues.some((i) => i.level === 'warn'))) {
  console.error(`✖ ${errors} errors, ${issues.length - errors} warnings — aborting`);
  process.exit(1);
}

// 2. Compile ---------------------------------------------------------------
const compiled: Compiled[] = compileEntries(raw, { publishDrafts: cfg.publishDrafts });
const defined = compiled.filter((c) => !isStub(c.entry));
// cross-links + proverb links only point at pages that have real content (stubs are noindex)
const resolve = makeResolver(defined);
const provBySlug = linkProverbs(proverbs, resolve);
const provById = new Map(proverbs.map((p) => [p.id, p]));

const rhymeRows: RhymeRow[] = compiled.map((c) => ({
  slug: c.keys.slug,
  lemma: c.entry.lemma,
  roman: c.keys.roman,
  syllables: c.keys.syllables,
  pos: c.entry.senses[0]?.pos ?? c.entry.posHint,
  freq: c.entry.freq,
  rhyme: c.keys.rhyme,
  ...(isStub(c.entry) ? {} : { d: 1 as const }),
}));
const rhymeBySlug = new Map(rhymeRows.map((r) => [r.slug, r]));
const bySingle = groupBy(rhymeRows, (r) => r.rhyme.single);
const bySlant = groupBy(rhymeRows, (r) => r.rhyme.slant);

// 3. Emit ------------------------------------------------------------------
rmSync(join(ROOT, cfg.staticOut), { recursive: true, force: true });

const rhymeCounts: Record<string, number> = {};
const wordShards = new Map<string, Record<string, unknown>>();
const rhymeShards = new Map<string, Record<string, unknown>>();
const toShard = (m: Map<string, Record<string, unknown>>, path: string, key: string, v: unknown) => {
  (m.get(path) ?? m.set(path, {}).get(path)!)[key] = v;
};
const rhymePageSlugs: string[] = [];
for (const c of defined) {
  const me = rhymeBySlug.get(c.keys.slug)!;
  const cands = [...(bySingle.get(me.rhyme.single) ?? []), ...(bySlant.get(me.rhyme.slant) ?? [])];
  const rhymes = findRhymes(me, cands, { limit: 500 });
  rhymeCounts[c.keys.slug] = rhymes.length;
  const rp = cfg.rhymePages ?? {};
  const definedRhymes = rhymes.filter((h) => h.defined).length;
  const common = (c.entry.freq ?? 1e9) <= (rp.maxFreqRank ?? 6000) || (rp.alwaysForEditorial !== false && (c.entry.src ?? []).includes('patro-editorial'));
  const rhymePage = definedRhymes >= (rp.minDefinedRhymes ?? 8) && common;
  if (rhymePage) rhymePageSlugs.push(c.keys.slug);
  const provs = (provBySlug.get(c.keys.slug) ?? []).map((id) => provById.get(id)!).filter(Boolean);
  const payload = assemblePayload(c, resolve, provs, rhymes.slice(0, RHYME_PREVIEW), { morph: NE_MORPH, registry });
  toShard(wordShards, wordShardPath(c.keys.slug), c.keys.slug, rhymePage ? { ...payload, rhymePage: true } : payload);
}

const rows = compiled.map(indexRow).sort((a, b) => (a[6] || 1e9) - (b[6] || 1e9));
out('idx/top.json', rows.slice(0, TOP_N));
// Buckets keyed by the first TWO characters keep each file small (≈10–60 KB gz) even at 50k+ words.
emitBuckets('l', rows, (r) => [latinBucket(r[4])]);
emitBuckets('d', rows, (r) => [devBucket(r[3])]);
emitBuckets('en', rows, (r) => [...new Set(r[7].toLowerCase().split(/[^a-z]+/).filter(Boolean).map((w) => w[0]))]);

for (const [k, list] of bySingle) if (k) toShard(rhymeShards, rhymeShardPath('s', k), rhymeShardKey('s', k), list.map(packRhyme));
for (const [k, list] of bySlant) if (k) toShard(rhymeShards, rhymeShardPath('l', k), rhymeShardKey('l', k), list.map(packRhyme));
for (const [p, obj] of [...wordShards, ...rhymeShards]) out(p, obj);

// A–Z browse lists (defined entries only), one file per initial letter
{
  const byInitial = groupBy(defined, (c) => [...c.entry.lemma][0]?.codePointAt(0)?.toString(16) ?? '');
  for (const [hex, list] of byInitial) {
    if (!hex) continue;
    out(`browse/${hex}.json`, list.sort((a, b) => a.entry.lemma.localeCompare(b.entry.lemma, 'ne')).map((c) => ({ slug: c.keys.slug, lemma: c.entry.lemma, roman: c.keys.roman })));
  }
  // initial letters with at least one defined word, in Nepali order (alphabet nav on the browse pages)
  out('browse/index.json', [...byInitial.keys()].filter(Boolean).map((h) => String.fromCodePoint(parseInt(h, 16))).sort((a, b) => a.localeCompare(b, 'ne')));
}

const slugsByProverb = new Map<string, string[]>();
for (const [slug, ids] of provBySlug) for (const id of ids) slugsByProverb.set(id, [...(slugsByProverb.get(id) ?? []), slug]);
out('ukhan.json', proverbs.map((p) => ({ ...p, slugs: slugsByProverb.get(p.id) ?? [] })));
const wotdEntries = Object.fromEntries(
  [...new Set([...wotd.pool, ...Object.values(wotd.overrides ?? {})])]
    .map((slug) => defined.find((c) => c.keys.slug === slug))
    .filter(Boolean)
    .map((c) => [c!.keys.slug, { lemma: c!.entry.lemma, roman: c!.keys.roman, ne: c!.entry.senses[0].ne, en: c!.entry.senses[0].en ?? [], example: c!.entry.senses.flatMap((s) => s.examples ?? [])[0] ?? null }]),
);
out('wotd.json', { pool: wotd.pool.filter((s) => wotdEntries[s]), overrides: wotd.overrides ?? {}, entries: wotdEntries });

const manifest = {
  version: 1, builtAt: new Date().toISOString(), count: compiled.length, defined: defined.length, stubs: compiled.length - defined.length,
  proverbs: proverbs.length, top: Math.min(TOP_N, rows.length), sources: registry,
};
out('manifest.json', manifest);

// For sitemap.ts + prerender.ts
const buildDir = join(ROOT, cfg.buildOut);
mkdirSync(buildDir, { recursive: true });
writeFileSync(join(buildDir, 'compiled.json'), JSON.stringify({ compiled, proverbs, provBySlug: Object.fromEntries(provBySlug), rhymeCounts, rhymePageSlugs, wotd, registry }));

console.log(`✔ ${compiled.length} headwords (${defined.length} defined, ${compiled.length - defined.length} stubs; ${raw.length - compiled.length} drafts skipped), ${proverbs.length} proverbs → ${cfg.staticOut}`);

// helpers -------------------------------------------------------------------
function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const arr = m.get(k) ?? [];
    arr.push(x);
    m.set(k, arr);
  }
  return m;
}

function emitBuckets(prefix: string, all: IndexRow[], keysOf: (r: IndexRow) => string[]) {
  const m = new Map<string, IndexRow[]>();
  for (const r of all) {
    for (const k of keysOf(r)) {
      if (!k) continue;
      const arr = m.get(k) ?? [];
      arr.push(r);
      m.set(k, arr);
    }
  }
  for (const [k, list] of m) out(`idx/${prefix}-${k}.json`, list);
}
