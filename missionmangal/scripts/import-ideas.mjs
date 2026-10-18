#!/usr/bin/env node
// Seeds the registry from data/ideas-2000.json (converted from 2000_Article_Ideas_aafnaipatro.xlsx). Root URLs: /{slug}/
import {readFile} from 'node:fs/promises';import {resolve,join} from 'node:path';
import {loadRegistry,saveRegistry,registerArticle} from '../core/engine.mjs';
const root=resolve('missionmangal'),path=join(root,'config','portfolio.json');
const ideas=JSON.parse(await readFile(join(root,'data','ideas-2000.json'),'utf8'));
let reg=await loadRegistry(path);const have=new Set(reg.map(r=>r.id));let added=0;
for(const i of ideas){const id='mm-'+String(i.n).padStart(4,'0');if(have.has(id))continue;
 reg=registerArticle(reg,{id,type:'topic',slug:i.slug,title:i.title,intent:'Answer: '+i.question});
 Object.assign(reg[reg.length-1],{meta:{category:i.category,format:i.format,title:i.title,question:i.question,target_words:i.target_words,min_citations:i.min_citations,perspectives:i.perspectives,apis:i.apis}});added++;}
await saveRegistry(path,reg);console.log('seeded '+added+' from sheet; registry '+reg.length);
