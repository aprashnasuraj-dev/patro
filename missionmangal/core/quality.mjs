export function auditArticle(a){
 const problems=[];
 const nonempty=(v,n)=>typeof v==='string'&&v.trim().length>=n;
 if(!a||typeof a!=='object')return ['Missing article'];
 if(!nonempty(a.id,3)||!nonempty(a.title,12)||!nonempty(a.intent,12)||!nonempty(a.original_contribution,30))problems.push('Missing identity, intent or original contribution');
 const sources=a.sources||[],claims=a.claims||[],media=a.media||[];
 // v2: route-aware policy travels with the article. Defaults are the strict v1 values, so v1 articles are audited exactly as before.
 const pol=a.quality_policy||{},minSources=Number.isFinite(pol.min_sources)?Math.max(2,pol.min_sources):5,requireMedia=pol.require_media!==false;
 if(!Array.isArray(sources)||sources.length<minSources||sources.length>20)problems.push('Must use '+minSources+'–20 verified sources');
 const ids=new Set(),urls=new Set(),claimIds=new Set(claims.map(c=>c.id));
 for(const s of sources){
  if(!s.id||ids.has(s.id)||!s.url||urls.has(s.url))problems.push('Duplicate/empty source');
  ids.add(s.id);urls.add(s.url);
  try { const u=new URL(s.url); if(!['https:','http:'].includes(u.protocol))throw Error(); }catch{problems.push('Malformed source URL');}
  if(s.verified!==true||!s.title||!s.publisher||!s.retrieved_at||Number.isNaN(Date.parse(s.retrieved_at)))problems.push('Incomplete or unverified source');
  if(!Array.isArray(s.claim_ids)||!s.claim_ids.length||s.claim_ids.some(id=>!claimIds.has(id)))problems.push('Unused source or unmapped claim');
 }
 if(!claims.length)problems.push('Missing claim ledger');
 for(const c of claims) {
  if(!c.id||!nonempty(c.text,8)||!Array.isArray(c.source_ids)||!c.source_ids.length||c.source_ids.some(id=>!ids.has(id)))problems.push('Unsupported claim');
  else for(const id of c.source_ids)if(!sources.find(s=>s.id===id)?.claim_ids?.includes(c.id))problems.push('Non-reciprocal source/claim map');
 }
 if(requireMedia&&!media.some(m=>['image','chart','diagram'].includes(m.type)&&m.rights_verified===true&&nonempty(m.alt,8)&&nonempty(m.credit,2)&&nonempty(m.license,2)&&/^https:\/\//.test(m.url||'')))problems.push('Licensed image, diagram or chart with alt text required');
 for(const m of media)if(['audio','video'].includes(m.type)&&(!m.rights_verified||!m.alt||!m.credit||!m.license))problems.push('Embedded media rights/accessibility missing');
 if(a.body_md && !nonempty(a.body_md,100))problems.push('Insufficient article body');
 if(a.status==='approved' && !nonempty(a.body_md,100))problems.push('Approved article needs researched body');
 return [...new Set(problems)];
}
export function assertPublishable(a){const p=auditArticle(a);if(p.length)throw Error(p.join('; '));if(a.status!=='approved')throw Error('Explicit approval required');return true;}
