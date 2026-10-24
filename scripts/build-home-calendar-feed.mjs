import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadHolidayMap} from './calendar-snapshot.mjs';
import {BUILD_DATE} from './sitemap-utils.mjs';
import {festivalFeed} from '../src/home-calendar-feed.mjs';
const year=Number(BUILD_DATE.slice(0,4));
const holidays=await loadHolidayMap();
const events=[];
for(const [date,items] of holidays){
  if(Number(date.slice(0,4))<year-1||Number(date.slice(0,4))>year+2)continue;
  for(const item of items){
    if(!item.name&&!item.nameEn)continue;
    events.push({date,name:item.name||item.nameEn,id:createHash('sha256').update(`${date}|${item.slug||item.key||item.name}|${item.kind||''}`).digest('hex').slice(0,24)});
  }
}
await mkdir('public/calendar',{recursive:true});
await writeFile('public/calendar/festivals.ics',festivalFeed(events,BUILD_DATE));
console.log(`Published static festival/holiday subscription: ${new Set(events.map(e=>e.id)).size} entries, AD ${year-1}–${year+2}.`);
