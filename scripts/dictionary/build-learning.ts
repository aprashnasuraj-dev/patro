/**
 * Learning + English data for the dictionary. Runs after build-dictionary.ts:
 *
 *   node scripts/dictionary/build-learning.ts
 *
 * Reads dict-build/compiled.json and writes (all lazy-loaded, CDN-cacheable):
 *   public/data/dict/v1/en/<aa>.json        English → Nepali index, bucketed by first two letters
 *   public/data/dict/v1/en/top.json         English headwords ranked by real English frequency (wordfreq)
 *   public/data/dict/v1/learn/ne-<L>.json   essential Nepali words per level (A1…B2) with English + example
 *   public/data/dict/v1/learn/en-<L>.json   essential English words per level with Nepali meanings
 *   public/data/dict/v1/quiz/bank.json      compact banks for meaning / synonym / antonym / spelling / ukhan quizzes
 *   public/data/dict/v1/spell/words.json    every headword + variant (spell-checker lexicon)
 *   dict-build/learning.json           summary for the sitemap + prerender
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  LEVELS, englishKeys, englishSlug, isStub, levelForRank, spellingVariants,
  type Compiled, type Level, type Proverb,
} from '../../src/lib/dictionary-core/index.ts';

const ROOT = process.cwd();
const cfg = JSON.parse(readFileSync(join(ROOT, 'data/dictionary/config.json'), 'utf8'));
const OUT = join(ROOT, cfg.staticOut);
const out = (rel: string, data: unknown) => {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
};
const { compiled, proverbs } = JSON.parse(readFileSync(join(ROOT, cfg.buildOut, 'compiled.json'), 'utf8')) as {
  compiled: Compiled[];
  proverbs: Proverb[];
};
const defined = compiled.filter((c) => !isStub(c.entry));
const short = (s: string, n = 90) => (s.length <= n ? s : s.slice(0, n - 1).replace(/[\s;,।]+\S*$/, '') + '…');

// English frequency ranks (wordfreq large_en, CC BY-SA 4.0)
const enRank = new Map<string, number>();
readFileSync(join(ROOT, 'data/dictionary/sources/wordfreq-en/en-rank.tsv'), 'utf8')
  .split('\n')
  .forEach((w, i) => w && !enRank.has(w) && enRank.set(w, i + 1));
const rankOfKey = (k: string) => Math.max(...k.split(/[ -]/).map((w) => enRank.get(w) ?? 1e6));
// grammatical words whose Nepali equivalent depends on context — kept in search, left out of learning lists
const EN_LIST_SKIP = new Set('in it on at as so be do up out get got has had have been was were are am is does did its can will would could should may might shall must the a an of to and or but if than then there here which who whom whose what when where why how that this these those'.split(' '));

// ───────────────────────── English → Nepali index ─────────────────────────
type EnHit = { s: string; l: string; r: string; p: string; d: string; g: string; f: number; o: number };
const enIndex = new Map<string, EnHit[]>();
for (const c of defined) {
  c.entry.senses.forEach((sense, si) => {
    (sense.en ?? []).forEach((gloss, gi) => {
      for (const [ki, key] of englishKeys(gloss).entries()) {
        const hit: EnHit = {
          s: c.keys.slug, l: c.entry.lemma, r: c.keys.roman, p: sense.pos, d: short(sense.ne),
          g: (sense.en ?? []).join(', '), f: c.entry.freq ?? 1e9,
          // exact-gloss matches first, then the most COMMON Nepali word, then earlier senses/glosses
          o: ki * 1e9 + Math.min(c.entry.freq ?? 50_000, 50_000) * 10 + si * 3 + gi,
        };
        const arr = enIndex.get(key) ?? [];
        if (!arr.some((h) => h.s === hit.s)) arr.push(hit);
        else {
          const prev = arr.find((h) => h.s === hit.s)!;
          if (hit.o < prev.o) Object.assign(prev, hit);
        }
        enIndex.set(key, arr);
      }
    });
  });
}
for (const [k, arr] of enIndex) {
  arr.sort((a, b) => a.o - b.o);
  enIndex.set(k, arr.slice(0, 12));
}
const enBuckets = new Map<string, Record<string, EnHit[]>>();
for (const [k, arr] of enIndex) {
  const b = k.replace(/[^a-z]/g, '').slice(0, 2).padEnd(2, '_');
  const o = enBuckets.get(b) ?? {};
  o[k] = arr;
  enBuckets.set(b, o);
}
for (const [b, o] of enBuckets) out(`en/${b}.json`, o);

const enTop = [...enIndex.keys()]
  .map((k) => ({ k, rank: rankOfKey(k) }))
  .filter((x) => x.rank < 1e6)
  .sort((a, b) => a.rank - b.rank || a.k.localeCompare(b.k));
// [key, englishRank, firstNepali, roman, slug]
out('en/top.json', enTop.slice(0, 8000).map(({ k, rank }) => {
  const h = enIndex.get(k)![0];
  return [k, rank, h.l, h.r, h.s];
}));

// ───────────────────────── learning lists ─────────────────────────
const LIST_LEVELS = LEVELS.filter((l) => l.id !== 'C1');
const neRanked = defined
  .filter((c) => c.entry.freq && c.entry.senses.some((s) => s.en?.length))
  .sort((a, b) => a.entry.freq! - b.entry.freq!);
const listCounts: Record<string, number> = {};
let lo = 0;
for (const L of LIST_LEVELS) {
  const items = neRanked
    .filter((c) => c.entry.freq! > lo && c.entry.freq! <= L.maxRank)
    .map((c) => {
      const s = c.entry.senses.find((x) => x.en?.length) ?? c.entry.senses[0];
      const ex = c.entry.senses.flatMap((x) => x.examples ?? [])[0];
      return { s: c.keys.slug, l: c.entry.lemma, r: c.keys.roman, p: s.pos, d: short(s.ne), e: (s.en ?? []).slice(0, 3).join(', '), x: ex ? [ex.ne, ex.en ?? ''] : undefined };
    });
  out(`learn/ne-${L.id}.json`, items);
  listCounts[`ne-${L.id}`] = items.length;
  lo = L.maxRank;
}
lo = 0;
for (const L of LIST_LEVELS) {
  const items = enTop
    .filter((x) => x.rank > lo && x.rank <= L.maxRank && !x.k.includes(' ') && !EN_LIST_SKIP.has(x.k))
    .map(({ k, rank }) => {
      const hits = enIndex.get(k)!.slice(0, 3);
      return { k, n: rank, m: hits.map((h) => [h.l, h.r, h.s, h.p]) };
    });
  out(`learn/en-${L.id}.json`, items);
  listCounts[`en-${L.id}`] = items.length;
  lo = L.maxRank;
}

// ───────────────────────── quiz banks ─────────────────────────
const lexSet = new Set<string>();
for (const c of compiled) {
  lexSet.add(c.entry.lemma);
  for (const v of c.entry.variants ?? []) lexSet.add(v);
}
const definedSet = new Set(defined.map((c) => c.entry.lemma));
const lv = (c: Compiled): Level => levelForRank(c.entry.freq);
const quizWords = neRanked.slice(0, 6000).map((c) => {
  const s = c.entry.senses.find((x) => x.en?.length)!;
  return [c.keys.slug, c.entry.lemma, s.pos, s.en![0], lv(c), short(s.ne, 70)];
});
const syn: unknown[] = [];
const ant: unknown[] = [];
const byLemma = new Map(defined.map((c) => [c.entry.lemma, c]));
const enWords = (c: Compiled) => new Set(c.entry.senses.flatMap((s) => (s.en ?? []).flatMap(englishKeys)));
const antSeen = new Set<string>();
const NEG_EN = /^(to )?(un|in|im|ir|il|non|dis|mis|a)[a-z]|\bnot\b|\bwithout\b|less\b|\black|\babsence|\bbad\b|\bwrong|\bill\b/i;
for (const c of defined) {
  const L = lv(c);
  const mine = enWords(c);
  // synonyms: thesaurus/editorial pairs, kept only when both words share an English meaning (filters noisy pairs)
  for (const s of c.entry.synonyms ?? []) {
    const o = byLemma.get(s);
    if (!o || s === c.entry.lemma) continue;
    if ([...enWords(o)].some((k) => mine.has(k))) syn.push([c.entry.lemma, s, c.entry.senses[0].pos, L, c.keys.slug]);
  }
  for (const a of c.entry.antonyms ?? []) if (definedSet.has(a)) {
    antSeen.add(c.entry.lemma + '|' + a);
    ant.push([c.entry.lemma, a, c.entry.senses[0].pos, L, c.keys.slug]);
  }
  // derived antonyms by negative prefix — classic विपरीतार्थी exam pairs (सफल/असफल, न्याय/अन्याय, राम्रो/नराम्रो)
  const w = c.entry.lemma;
  const prefixed = /^[अआइईउऊएऐओऔ]/.test(w) ? ['अन' + w.replace(/^अ/, 'ा').replace(/^ा/, ''), 'अन्' + w] : ['अ' + w, 'न' + w, 'बे' + w];
  for (const p of prefixed) {
    const o = byLemma.get(p);
    if (!o || antSeen.has(w + '|' + p)) continue;
    // keep only when the English confirms a negative meaning (un-, in-, dis-, non-, not, without, -less …)
    if (!o.entry.senses.some((s) => (s.en ?? []).some((g) => NEG_EN.test(g)))) continue;
    antSeen.add(w + '|' + p);
    ant.push([w, p, c.entry.senses[0].pos, L, c.keys.slug]);
  }
}
const spell: unknown[] = [];
for (const c of neRanked.slice(0, 8000)) {
  const w = c.entry.lemma;
  if ([...w].length < 3 || /\s/.test(w)) continue;
  const wrong = spellingVariants(w).filter((v) => !lexSet.has(v)).slice(0, 3);
  if (wrong.length >= 2) spell.push([w, wrong, lv(c), c.keys.slug]);
}
const ukhan = proverbs.map((p) => [p.text, p.meaningNe, p.kind, p.englishEquivalent ?? '']);
out('quiz/bank.json', { words: quizWords, syn, ant, spell, ukhan });

// ───────────────────────── spell-check lexicon ─────────────────────────
out('spell/words.json', [...lexSet].sort());

// ───────────────────────── summary ─────────────────────────
const summary = {
  enKeys: enIndex.size,
  enTopRanked: enTop.length,
  enPrerender: enTop.slice(0, cfg.english?.prerenderTop ?? 5000).map((x) => x.k),
  lists: listCounts,
  quiz: { words: quizWords.length, synonyms: syn.length, antonyms: ant.length, spelling: spell.length, ukhan: ukhan.length },
  spellWords: lexSet.size,
};
writeFileSync(join(ROOT, cfg.buildOut, 'learning.json'), JSON.stringify({ ...summary, enIndex: Object.fromEntries([...enIndex].filter(([k]) => summary.enPrerender.includes(k))) }));
console.log(`✔ learning: ${summary.enKeys} English keys (${summary.enPrerender.length} prerendered), lists ${JSON.stringify(listCounts)}, quiz ${JSON.stringify(summary.quiz)}, spell lexicon ${summary.spellWords}`);
export { englishSlug };
