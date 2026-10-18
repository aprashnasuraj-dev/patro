#!/usr/bin/env node
// Post-build, pre-merge smoke test on dist/: every sitemap URL maps to a file, counts match, no reserved/legacy collisions.
import {readFile,access,readdir} from 'node:fs/promises';import {join,resolve} from 'node:path';
import {RESERVED_ROOT} from '../core/portfolio.mjs';
export async function smoke(dist,{expect}={}){
 const xml=await readFile(join(dist,'sitemap-missionmangal.xml'),'utf8');const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 if(!urls.length)throw Error('Empty sitemap');if(new Set(urls).size!==urls.length)throw Error('Duplicate sitemap URLs');if(expect!==undefined&&urls.length!==expect)throw Error('Expected '+expect+' URLs, found '+urls.length);
 for(const u of urls){const p=new URL(u).pathname;if(!p.endsWith('/'))throw Error('Non-trailing-slash URL '+u);const first=p.split('/')[1];if(p.split('/').filter(Boolean).length===1&&RESERVED_ROOT.has(first))throw Error('Reserved root collision '+u);await access(join(dist,p,'index.html'));
  const html=await readFile(join(dist,p,'index.html'),'utf8');if(!html.includes('rel="canonical" href="'+u+'"'))throw Error('Canonical mismatch '+u);if(/noindex/i.test(html))throw Error('noindex on '+u);}
 return urls.length;
}
if(process.argv[1]?.endsWith('smoke-dist.mjs')){const n=await smoke(resolve(process.argv[2]||'dist'));console.log('smoke ok: '+n+' URLs');}
