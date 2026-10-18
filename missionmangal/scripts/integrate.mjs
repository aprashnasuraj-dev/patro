#!/usr/bin/env node
// Explicit local opt-in only. Run AFTER existing Vite build; never called by root scripts.
import {readFile,access,cp,mkdir,writeFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {folderFor,RESERVED_ROOT} from '../core/portfolio.mjs';
const staging=resolve('.missionmangal-staging'),dist=resolve('dist');
if(process.env.MANGAL_INTEGRATION_APPROVED!=='YES')throw Error('Explicit integration approval flag required');
await access(join(dist,'index.html'));
const snapshot=JSON.parse(await readFile(join(staging,'registry.snapshot.json'),'utf8'));
const allowed=new Set(['','articles','blogs','facts','what']);
const pending=snapshot.filter(r=>r.status==='published');
if(pending.length<1)throw Error('No approved rendered pages to integrate');
const seen=new Set();
for(const r of pending){
 const folder=folderFor(r.type||'blog');
 if(!allowed.has(folder)||seen.has(folder+'/'+r.slug))throw Error('Invalid or duplicate route');seen.add(folder+'/'+r.slug);if(folder===''&&RESERVED_ROOT.has(r.slug))throw Error('Reserved root slug '+r.slug);
 await access(join(staging,folder,r.slug,'index.html'));
 // Collision test is mandatory for every single article: existing Facts files must never be overwritten.
 try{await access(join(dist,folder,r.slug));throw Error('Existing production asset collision: '+folder+'/'+r.slug);}catch(e){if(e.code!=='ENOENT')throw e;}
}
for(const r of pending){
 const folder=folderFor(r.type||'blog');
 await mkdir(join(dist,folder),{recursive:true});
 await cp(join(staging,folder,r.slug),join(dist,folder,r.slug),{recursive:true,errorOnExist:true,force:false});
}
await cp(join(staging,'sitemap-missionmangal.xml'),join(dist,'sitemap-missionmangal.xml'),{errorOnExist:true,force:false});
console.log('Opt-in artifact integration passed for '+pending.length+' pages; root Worker configuration unchanged. Requires HTTP preview smoke tests and merge approval.');
