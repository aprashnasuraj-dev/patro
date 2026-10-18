#!/usr/bin/env node
// Turns the pinned public-apis README into LEADS (keyless, HTTPS, useful categories) for adding future adapters. Does not call anything.
import {readFile,writeFile} from 'node:fs/promises';import {resolve,join} from 'node:path';
const KEEP=/science|math|animals|space|geocoding|open data|government|books|art|museum|environment|weather|transportation|text analysis|news|dictionaries|documents|health/i;
export function parse(md){const rows=[];let cat='';for(const l of md.split('\n')){const h=l.match(/^###\s+(.+)/);if(h){cat=h[1].trim();continue;}const m=l.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]*)\|\s*`?([^`|]*)`?\s*\|\s*`?([^`|]*)`?\s*\|\s*`?([^`|]*)`?\s*\|/);if(m)rows.push({category:cat,name:m[1],docs:m[2],description:m[3].trim(),auth:m[4].trim(),https:/yes/i.test(m[5]),cors:m[6].trim()});}return rows;}
export const leads=rows=>rows.filter(r=>r.https&&/^no$/i.test(r.auth)&&KEEP.test(r.category));
if(process.argv[1]?.endsWith('triage-catalog.mjs')){const root=resolve('missionmangal');const rows=parse(await readFile(join(root,'vendor/public-apis/README.md'),'utf8'));const L=leads(rows);
 await writeFile(join(root,'config','catalog-leads.json'),JSON.stringify({note:'Leads only. Each needs an endpoint format + normalizer before use. Generated from pinned public-apis SHA.',total_listed:rows.length,leads:L},null,1));console.log(rows.length+' listed, '+L.length+' keyless-HTTPS leads in useful categories');}
