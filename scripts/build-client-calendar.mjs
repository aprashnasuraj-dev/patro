import {getAllDays} from '../lib/patro.mjs';import {mkdir,writeFile} from 'node:fs/promises';
const rows=await getAllDays(),years=new Map();for(const row of rows){const y=Number(row.ad.slice(0,4));if(!years.has(y))years.set(y,[]);years.get(y).push(row);}
await mkdir('public/data/calendar/ad',{recursive:true});for(const [year,items]of years)await writeFile(`public/data/calendar/ad/${year}.json`,JSON.stringify({schema:1,calendar:'ad',year,rows:items}));
console.log(`client calendar: ${rows.length} immutable rows in ${years.size} static year shards (no D1/R2 per view)`);
