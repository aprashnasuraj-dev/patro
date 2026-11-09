#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const file = process.argv[2];
if (!file) { console.error('Usage: node missionmangal/scripts/validate-article.mjs <article.json>'); process.exit(2); }
const article = JSON.parse(readFileSync(file,'utf8'));
const errors = [];
const requiredString = (v,label,min=1) => { if (typeof v !== 'string' || v.trim().length < min) errors.push(label+' is required'); };
requiredString(article.id,'id',3); requiredString(article.title,'title',12); requiredString(article.intent,'intent',12); requiredString(article.original_contribution,'original_contribution',30);
if (!Array.isArray(article.sources) || article.sources.length < 5 || article.sources.length > 20) errors.push('5–20 distinct verified used sources required');
const sources = article.sources ?? [], claims = article.claims ?? [], media = article.media ?? [];
const sids = new Set(), urls = new Set(), cids = new Set(claims.map(c=>c.id));
for (const s of sources) {
 if (!s.id || sids.has(s.id)) errors.push('duplicate/missing source ID '+s.id); sids.add(s.id);
 if (!s.url || urls.has(s.url)) errors.push('duplicate/missing source URL '+s.url); urls.add(s.url);
 try { if (!/^https?:$/.test(new URL(s.url).protocol)) throw Error(); } catch {errors.push('bad source URL '+s.id);}
 if (s.verified !== true || !s.publisher || !s.title || !s.retrieved_at || Number.isNaN(Date.parse(s.retrieved_at))) errors.push('unverified/incomplete source '+s.id);
 if (!Array.isArray(s.claim_ids) || !s.claim_ids.length || s.claim_ids.some(id=>!cids.has(id))) errors.push('unused or unmapped source '+s.id);
}
if (!claims.length) errors.push('claim ledger required');
for (const c of claims) { if (!c.id || !c.text || !Array.isArray(c.source_ids) || !c.source_ids.length || c.source_ids.some(id=>!sids.has(id))) errors.push('unsupported claim '+c.id); else for(const id of c.source_ids) if(!sources.find(s=>s.id===id)?.claim_ids?.includes(c.id)) errors.push('non-reciprocal mapping '+c.id+' -> '+id); }
if (!media.some(m=>['image','chart','diagram'].includes(m.type) && m.rights_verified === true && m.alt?.trim() && m.credit?.trim() && m.license?.trim() && /^https?:\/\//.test(m.url??''))) errors.push('at least one licensed attributed image/chart/diagram with alt text required');
for(const m of media) if (['video','audio'].includes(m.type) && (!m.rights_verified || !m.credit || !m.license || !m.alt)) errors.push('media rights/accessibility incomplete');
if (errors.length) { console.error(errors.map(e=>'FAIL: '+e).join('\n')); process.exit(1); }
console.log('PASS evidence structure ('+sources.length+' verified used sources, '+claims.length+' mapped claims)');
