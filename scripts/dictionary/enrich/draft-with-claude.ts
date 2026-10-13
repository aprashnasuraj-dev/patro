/**
 * Draft missing dictionary content with Claude, as reviewable TSV files.
 *
 *   ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=<model id from docs.claude.com> \
 *     node scripts/dictionary/enrich/draft-with-claude.ts --glosses --limit 2000
 *   … --define  --limit 1000      # write definitions for the most frequent stub words
 *   … --dry-run                   # print the first prompt, call nothing
 *
 * Output (never overwrites, never publishes directly):
 *   --glosses → data/editorial/glosses/ai-YYYYMMDD-NNN.tsv   (English for existing Nepali senses)
 *   --define  → data/editorial/ai-define-YYYYMMDD-NNN.tsv     (new senses for stub headwords)
 * Every file starts with a "needs review" header. An editor reviews/edits, then `npm run dict:build`.
 *
 * Resumable: words already present in any TSV (or already glossed) are skipped, so you can
 * stop and re-run. Run `npm run dict:build` first so dict-build/compiled.json is fresh.
 *
 * Content policy baked into the prompt: write ORIGINAL short definitions; never reproduce
 * text from any published dictionary; say SKIP when unsure (proper names, fragments, typos).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Compiled, LexiconEntry } from '../../../src/lib/dictionary-core/index.ts';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string, d: number) => Number(args[args.indexOf(`--${n}`) + 1]) || d;
const MODE = flag('define') ? 'define' : 'glosses';
const LIMIT = opt('limit', 500);
const BATCH = opt('batch', MODE === 'define' ? 40 : 80);
const DRY = flag('dry-run');
const MODEL = process.env.ANTHROPIC_MODEL;
const KEY = process.env.ANTHROPIC_API_KEY;
if (!DRY && (!KEY || !MODEL)) {
  console.error('Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL (a current model id, see https://docs.claude.com/en/docs/about-claude/models). Or use --dry-run.');
  process.exit(1);
}

const compiled: Compiled[] = JSON.parse(readFileSync(join(ROOT, 'dict-build/compiled.json'), 'utf8')).compiled;
const open: LexiconEntry[] = JSON.parse(readFileSync(join(ROOT, 'data/dictionary/lexicon.open.json'), 'utf8')).entries;
const openBy = new Map(open.map((e) => [e.lemma, e]));

// ── what's already covered (resume) ──
const done = new Set<string>();
const scan = (dir: string) => existsSync(dir) && readdirSync(dir).filter((f) => f.endsWith('.tsv')).forEach((f) =>
  readFileSync(join(dir, f), 'utf8').split('\n').forEach((l) => l && !l.startsWith('#') && done.add(l.split('\t')[0] + (MODE === 'glosses' ? '|' + l.split('\t')[1] : ''))));
scan(join(ROOT, 'data/dictionary/editorial'));
scan(join(ROOT, 'data/dictionary/editorial/glosses'));

// ── work list, most frequent first ──
const byFreq = [...compiled].sort((a, b) => (a.entry.freq ?? 1e9) - (b.entry.freq ?? 1e9));
type Item = { lemma: string; sid?: string; pos?: string; ne?: string };
const items: Item[] = [];
for (const c of byFreq) {
  if (items.length >= LIMIT) break;
  const e = c.entry;
  if (MODE === 'glosses') {
    const src = openBy.get(e.lemma);
    if (!src) continue;
    for (const s of src.senses) {
      const merged = e.senses.find((x) => x.ne === s.ne);
      if (merged?.en?.length || done.has(`${e.lemma}|${s.id}`)) continue;
      items.push({ lemma: e.lemma, sid: s.id, pos: s.pos, ne: s.ne });
    }
  } else if (!e.senses.length && !done.has(e.lemma)) {
    items.push({ lemma: e.lemma, pos: e.posHint });
  }
}
console.log(`${items.length} items to draft (${MODE})`);

const SYSTEM = `You are a careful Nepali–English lexicographer writing ORIGINAL content for an open, CC BY-SA Nepali dictionary.
Rules: never copy wording from any published dictionary; keep definitions short and plain; use standard Nepali spelling;
if a word is a proper name, a fragment, a typo, an inflected form of another word, or you are not confident, output SKIP for it.
Output ONLY tab-separated lines, no commentary, no code fences.`;

function prompt(batch: Item[]): string {
  if (MODE === 'glosses') {
    return `For each line (lemma, sense id, part of speech, Nepali definition) give concise English glosses (1–4, comma-separated) that translate THAT sense.
Output format per line: lemma<TAB>sense id<TAB>english glosses   (or lemma<TAB>sense id<TAB>SKIP)

${batch.map((b) => `${b.lemma}\t${b.sid}\t${b.pos}\t${b.ne}`).join('\n')}`;
  }
  return `For each Nepali headword, write one or two senses. Output format per sense:
lemma<TAB>pos<TAB>short Nepali definition<TAB>English glosses (comma)<TAB>simple Nepali example sentence<TAB>English translation of the example
pos is one of: n adj v adv pron post conj part num intj phrase. Hints in brackets are a guess from a spell-checker and may be wrong.
If unsure or not a common word: lemma<TAB>SKIP

${batch.map((b) => `${b.lemma}${b.pos ? ` [${b.pos}]` : ''}`).join('\n')}`;
}

async function call(batch: Item[]): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: SYSTEM, messages: [{ role: 'user', content: prompt(batch) }] }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.content.map((c: { text?: string }) => c.text ?? '').join('');
}

if (DRY) {
  console.log('--- system ---\n' + SYSTEM + '\n--- first prompt ---\n' + prompt(items.slice(0, BATCH)));
  process.exit(0);
}

const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const outDir = MODE === 'glosses' ? join(ROOT, 'data/dictionary/editorial/glosses') : join(ROOT, 'data/dictionary/editorial');
mkdirSync(outDir, { recursive: true });
let fileNo = 1;
for (let i = 0; i < items.length; i += BATCH) {
  const batch = items.slice(i, i + BATCH);
  const want = new Set(batch.map((b) => (MODE === 'glosses' ? `${b.lemma}\t${b.sid}` : b.lemma)));
  let text = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      text = await call(batch);
      break;
    } catch (e) {
      console.warn(`batch ${i / BATCH + 1} attempt ${attempt}: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  const cols = MODE === 'glosses' ? 3 : 6;
  const good = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/\tSKIP\s*$/.test(l))
    .filter((l) => {
      const c = l.split('\t');
      return c.length >= (MODE === 'glosses' ? 3 : 4) && c.length <= cols && want.has(MODE === 'glosses' ? `${c[0]}\t${c[1]}` : c[0]);
    });
  const name = MODE === 'glosses' ? `ai-${stamp}-${String(fileNo).padStart(3, '0')}.tsv` : `ai-define-${stamp}-${String(fileNo).padStart(3, '0')}.tsv`;
  let path = join(outDir, name);
  while (existsSync(path)) path = join(outDir, name.replace('.tsv', `-${++fileNo}.tsv`));
  writeFileSync(path, `# AI DRAFT (${MODEL}) — NEEDS REVIEW by a Nepali editor before publishing. Original content, CC BY-SA 4.0.\n${good.join('\n')}\n`);
  console.log(`✔ ${path.replace(ROOT + '/', '')}: ${good.length} lines (${batch.length - good.length} skipped/invalid)`);
  fileNo++;
}
console.log('Next: review the new TSV files, then `npm run dict:build`.');
