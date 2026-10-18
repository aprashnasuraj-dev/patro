#!/usr/bin/env node
// Queue topics as 'reserved' registry records. Nothing is generated or published here.
// usage: node missionmangal/scripts/seed-topics.mjs topics.txt [--type topic|answer|fact|blog|article] [--compact]
import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {loadRegistry,saveRegistry,registerArticle} from '../core/engine.mjs';
import {slugify,TARGET_ARTICLES,MAX_ARTICLES} from '../core/portfolio.mjs';
const [file,...rest]=process.argv.slice(2);if(!file)throw Error('topics file required (one title per line)');
const type=rest.includes('--type')?rest[rest.indexOf('--type')+1]:'topic',compact=rest.includes('--compact');
const path=resolve('missionmangal/config/portfolio.json');let reg=await loadRegistry(path);
let added=0,skipped=[];
for(const line of (await readFile(file,'utf8')).split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'))){
 const slug=compact?slugify(line).replace(/-/g,''):slugify(line);
 try{reg=registerArticle(reg,{id:'mm-'+type+'-'+slug.slice(0,60),type,slug,title:line,intent:'Answer: '+line});added++;}catch(e){skipped.push(line+' -> '+e.message);}
}
await saveRegistry(path,reg);
console.log('queued '+added+', skipped '+skipped.length+', registry '+reg.length+'/'+MAX_ARTICLES+' (target '+TARGET_ARTICLES+')');skipped.slice(0,20).forEach(s=>console.log('  skip: '+s));
