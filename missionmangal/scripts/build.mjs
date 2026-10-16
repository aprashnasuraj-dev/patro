#!/usr/bin/env node
// Explicitly opt-in offline staging build; NEVER called by the root production build.
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,join} from 'node:path';
import {loadRegistry,buildApproved} from '../core/engine.mjs';
import {assertRegistry} from '../core/portfolio.mjs';
const root=resolve('missionmangal');const registry=await loadRegistry(join(root,'config','portfolio.json'));assertRegistry(registry);
const articles=[];for(const r of registry.filter(r=>['approved','rendered','published'].includes(r.status)))articles.push(JSON.parse(await readFile(join(root,'content',r.id+'.json'),'utf8')));
const out=resolve('.missionmangal-staging');const built=await buildApproved({registry,articles,outDir:out});
await writeFile(join(out,'registry.snapshot.json'),JSON.stringify(built.registry,null,2)+'\n');
console.log('STAGED ONLY: '+built.rendered+' verified rendered pages; sitemap '+built.sitemap+'; live dist/ unchanged');
