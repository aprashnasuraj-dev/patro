import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import cities from './cities.json' with {type:'json'};
const root=new URL('../../migration/data/public/on_this_day_events/',import.meta.url), grouped={};
for(const file of readdirSync(root).filter(x=>x.endsWith('.json'))){for(const r of JSON.parse(readFileSync(new URL(file,root),'utf8')).rows){if(r.verification_status!=='source-backed'||!/^https?:\/\//.test(r.source_url||'')||r.published===false)continue;const key=String(r.ad_month).padStart(2,'0')+'-'+String(r.ad_day).padStart(2,'0');(grouped[key]??=[]).push({year:r.ad_year,title:r.title_en||r.title_ne,url:r.source_url,importance:r.importance||0});}}
for(const key in grouped){grouped[key].sort((a,b)=>b.importance-a.importance);grouped[key]=grouped[key].slice(0,1).map(({importance,...r})=>r);}
writeFileSync(new URL('./history.json',import.meta.url),JSON.stringify(grouped)+'\n');
const terms=['sunrise','sunset','moon phase','moon illumination','moonrise','moonset','daylight duration','Nepali date','on this day history','astronomical calendar'];
writeFileSync(new URL('./search-intents.json',import.meta.url),JSON.stringify({status:'500 relevant intent hypotheses; not verified Google top-500 rankings',intents:cities.flatMap(c=>terms.map(t=>({query:`${t} ${c.name}`,city:c.slug,route:`/atlas/${c.slug}`,dateTemplate:`/atlas/${c.slug}/{YYYY-MM-DD}`})))},null,2)+'\n');
