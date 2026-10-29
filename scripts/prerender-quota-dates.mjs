import { build } from 'esbuild';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {PRERENDER_CALENDAR_YEARS} from './seo-config.mjs';
import {loadCalendarSnapshot} from './calendar-snapshot.mjs';

// Reuse the production renderer, including Atlas enrichment. No second calendar algorithm.
// Flat .html files let Cloudflare serve the existing slashless canonical URL directly.
const root=process.cwd(),dist=resolve(root,'dist'),scratch=resolve(root,'.cloudflare/quota-build');
await mkdir(scratch,{recursive:true});
const bundle=resolve(scratch,'archive-renderer.mjs');
await build({entryPoints:['worker/public-archive-pages.ts'],outfile:bundle,bundle:true,format:'esm',platform:'node',logLevel:'silent'});
const {publicArchivePageResponse}=await import(pathToFileURL(bundle));
const env={PUBLIC_SITE_URL:'https://aafnaipatro.com',ASSETS:{async fetch(request){
  const path=new URL(request.url).pathname;
  if(!/^\/data\/calendar\/(?:ad|bs)\/\d{4}\.json$/.test(path))return new Response(null,{status:404});
  try{return new Response(await readFile(resolve(dist,'.'+path)),{headers:{'content-type':'application/json'}});}catch{return new Response(null,{status:404});}
}}};
const years=new Set(PRERENDER_CALENDAR_YEARS);
const mainDates=new Set((await loadCalendarSnapshot()).filter(row=>years.has(Number(row.bs?.year))).map(row=>row.ad));
const dates=new Set(mainDates);
for(const entry of await readdir(resolve(dist,'date'),{withFileTypes:true})){
  const date=entry.name.replace(/\.html$/,'');
  if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&!mainDates.has(date))await rm(resolve(dist,'date',entry.name),{recursive:true,force:true});
}
// A bounded release cohort augments the existing five-year calendar window.
// Entries are public dates, with no visitor identifiers or analytics payloads.
const cohort=JSON.parse(await readFile('config/static-date-cohort.json','utf8'));
for(const date of cohort.dates)dates.add(date);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const recentDays=Number(cohort.recent_days);
if(!Number.isInteger(recentDays)||recentDays<0||recentDays>5000)throw Error('Invalid static date cohort budget');
for(let offset=0;offset<recentDays;offset++)dates.add(new Date(Date.parse(today+'T00:00:00Z')-offset*86400000).toISOString().slice(0,10));
if(dates.size>7500)throw Error('Complete static date cohort exceeds its 7500-file ceiling');
const dateAssets=resolve(root,'.cloudflare/date-pages');
await rm(dateAssets,{recursive:true,force:true});await mkdir(resolve(dateAssets,'date'),{recursive:true});
let count=0;
for(const date of [...dates].sort()){
  const response=await publicArchivePageResponse(new Request('https://aafnaipatro.com/date/'+date),env);
  if(!response?.ok)throw Error('Static date renderer failed: '+date);
  const html=await response.text();
  if(!html.includes('href="https://aafnaipatro.com/date/'+date+'"')||!html.includes('data-seo-prerender="true"'))throw Error('Static date identity missing: '+date);
  if(date>='1927-10-09'&&date<='2037-04-13'&&!html.includes('id="local-panchang"'))throw Error('Static date enrichment missing: '+date);
  await writeFile(resolve(dateAssets,'date',date+'.html'),html);
  if(mainDates.has(date))await writeFile(resolve(dist,'date',date+'.html'),html);
  await rm(resolve(dist,'date',date),{recursive:true,force:true});
  count++;
  if(count%1000===0)console.log('Complete static date pages: '+count);
}
await writeFile(resolve(scratch,'date-manifest.json'),JSON.stringify({count,dates:[...dates].sort()},null,2)+'\n');
console.log('Quota date delivery: '+count+' complete static pages; uncaptured dates retain the production renderer.');

// A dedicated asset-first Worker avoids the primary application's Worker-first
// routing without sending missing dates into an asset-only 404 rule.
await copyFile(resolve(dist,'_headers'),resolve(dateAssets,'_headers'));
