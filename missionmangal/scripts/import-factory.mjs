#!/usr/bin/env node
// Seeds 3,000 more reserved root URLs (2,000 niche topics + 1,000 search-gap queries) from data/factory-3000.json.
import {readFile} from 'node:fs/promises';import {resolve,join} from 'node:path';
import {loadRegistry,saveRegistry,registerArticle} from '../core/engine.mjs';
const root=resolve('missionmangal'),path=join(root,'config','portfolio.json');
const items=JSON.parse(await readFile(join(root,'data','factory-3000.json'),'utf8'));
let reg=await loadRegistry(path);const have=new Set(reg.map(r=>r.id));let added=0;
for(const i of items){if(have.has(i.id))continue;reg=registerArticle(reg,{id:i.id,type:'topic',slug:i.slug,title:i.title,intent:'Answer: '+i.question});
 Object.assign(reg[reg.length-1],{meta:{category:i.category,format:i.format,title:i.title,question:i.question,target_words:i.target_words,min_citations:12,primary_api:i.primary_api,image_api:i.image_api,images_needed:i.images_needed,angle:i.angle,audience:i.audience}});added++;}
await saveRegistry(path,reg);console.log('seeded '+added+'; registry '+reg.length);
