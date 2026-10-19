#!/usr/bin/env node
// Deterministic no-LLM fallback. Produces source-led research dossiers as release candidates,
// never as approved/publishable articles. Every displayed factual passage is tied to stored evidence.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadRegistry } from '../core/engine.mjs';
import { loadState } from './plan.mjs';

const args = new Map(process.argv.slice(2).reduce((a, v, i, xs) => {
  if (v.startsWith('--')) a.push([v.slice(2), xs[i + 1]]);
  return a;
}, []));
const arg = (k, d) => args.get(k) ?? d;
const wordCount = s => (String(s).match(/\b[\w'’-]+\b/g) || []).length;
const esc = s => String(s ?? '').replace(/\s+/g, ' ').trim();
export function buildEvidenceDossier({ topic, row, registryItem, evidence, now = () => new Date() }) {
  const usable = evidence.filter(e => e?.url && Array.isArray(e.excerpts) && e.excerpts.some(x => esc(x).length >= 35));
  const unique = [...new Map(usable.map(e => [e.url, e])).values()].slice(0, 8);
  if (!unique.length) return null;
  const title = esc(registryItem?.meta?.title || registryItem?.intent?.replace(/^Answer:\s*/, '') || topic);
  const sections = unique.map((e, i) => {
    // Keep stored quotation material short: at most 25 words per source in the dossier.
    const passages = e.excerpts.map(esc).filter(x => x.length >= 35).slice(0, 1).map(x => {
      const words = x.split(/\s+/);
      return words.length > 25 ? words.slice(0, 25).join(' ') + '…' : x;
    });
    if (!passages.length) return '';
    return `## Evidence record ${i + 1}: ${esc(e.title || 'Untitled source')}\n\nPublisher: ${esc(e.publisher || 'Not recorded')}\n\nURL: ${e.url}\n\nRetrieved: ${esc(e.retrieved_at || 'date not recorded')}\n\n### Stored passages\n\n${passages.map((p, j) => `- “${p}”`).join('\n\n')}`;
  }).filter(Boolean);
  const body_md = [
    `# ${title}`,
    '> Deterministic evidence dossier generated without an LLM. This is research material, not an approved article. Quoted passages remain attributed to their original sources; editorial synthesis and independent claim verification are still required.',
    '## Research question',
    esc(registryItem?.meta?.question || title),
    '## Source coverage',
    `This dossier contains ${unique.length} distinct source URL(s). The count indicates retrieval coverage only; it does not establish source independence, authority, correctness, or sufficiency.`,
    ...sections,
    '## Editorial work still required',
    '- Independently verify each factual claim against the cited source.',
    '- Resolve conflicting, stale, or incomplete evidence.',
    '- Write original synthesis without copying source phrasing.',
    '- Apply the route-specific quality gate before approval or publication.'
  ].join('\n\n');
  return {
    id: registryItem.id, type: registryItem.type || 'topic', slug: registryItem.slug || registryItem.id,
    title, description: `Evidence dossier for research question: ${title}. Not approved for publication.`,
    intent: registryItem.intent || title, author: 'Mission Mangal research pipeline',
    status: 'release_candidate', original_contribution: 'Deterministic evidence inventory; no original synthesis is claimed.',
    body_md, faq: [], claims: [], sources: unique.map((e, i) => ({
      id: e.id || `fallback-s${i + 1}`, url: e.url, title: e.title || '', publisher: e.publisher || '',
      published_at: e.published_at || undefined, retrieved_at: e.retrieved_at || undefined,
      sha256: e.sha256 || undefined, verified: false, claim_ids: []
    })),
    media: [], provenance: { route: row.route, engine: 'deterministic-evidence-dossier', source_count: unique.length, generated_at: now().toISOString() },
    review: { mode: 'manual-required', policy: 'never-auto-approve-fallback', reason: 'No healthy LLM or no successful LLM draft; dossier is not an article.' }
  };
}
export async function runFallback({ root = resolve('missionmangal'), worker = 0, workers = 1, now = () => new Date(), log = console.log } = {}) {
  const config = JSON.parse(await readFile(join(root, 'v2', 'config.json'), 'utf8'));
  const registry = await loadRegistry(join(root, 'config', 'portfolio.json'));
  const registryById = new Map(registry.map(x => [x.id, x]));
  const plan = JSON.parse(await readFile(join(root, 'v2-work', 'plan.json'), 'utf8'));
  const state = await loadState(join(root, 'state'));
  const out = join(root, 'state', `v2-${worker}`);
  await mkdir(join(out, 'content'), { recursive: true });
  const ledgerPath = join(out, 'ledger.jsonl');
  const existing = new Set();
  for (const f of await readdir(join(out, 'content')).catch(() => [])) if (f.endsWith('.json')) existing.add(f.slice(0, -5));
  const priorLedger = (await readFile(ledgerPath, 'utf8').catch(() => '')).split('\n').filter(Boolean);
  const done = new Set(priorLedger.flatMap(line => { try { const x = JSON.parse(line); return ['approved','release_candidate','review'].includes(x.status) ? [x.id] : []; } catch { return []; } }));
  const summaryPath = join(out, 'summary.json');
  const summary = JSON.parse(await readFile(summaryPath, 'utf8').catch(() => '{}'));
  let dossiers = 0, noEvidence = 0, alreadyDone = 0;
  for (const row of plan.rows.filter((_, i) => i % workers === worker)) {
    if (existing.has(row.id) || done.has(row.id)) { alreadyDone++; continue; }
    const item = registryById.get(row.id);
    if (!item || row.route === 'ymyl') { noEvidence++; continue; } // Never auto-generate sensitive-topic material.
    const dossier = buildEvidenceDossier({ topic: item.intent, row, registryItem: item, evidence: state.evidence.get(row.id) || [], now });
    if (!dossier) { noEvidence++; continue; }
    const file = join(out, 'content', row.id + '.json');
    await writeFile(file, JSON.stringify(dossier, null, 2) + '\n');
    await writeFile(ledgerPath, JSON.stringify({ id: row.id, status: 'release_candidate', engine: 'deterministic-evidence-dossier', at: now().toISOString(), reason: 'No LLM synthesis; manual editorial review required', sources: dossier.sources.length }) + '\n', { flag: 'a' });
    dossiers++;
  }
  const updated = { ...summary, worker, workers, fallback_dossiers: dossiers, fallback_no_evidence: noEvidence, fallback_already_done: alreadyDone, fallback_finished_at: now().toISOString() };
  await writeFile(summaryPath, JSON.stringify(updated, null, 2) + '\n');
  log(JSON.stringify({ worker, dossiers, noEvidence, alreadyDone }));
  return { dossiers, noEvidence, alreadyDone };
}
if (process.argv[1]?.endsWith('fallback.mjs')) {
  const result = await runFallback({ worker: Number(arg('worker', 0)), workers: Number(arg('workers', 1)) });
  console.log(JSON.stringify(result));
}
