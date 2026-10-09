import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {festivalFeature,cityTime,saits} from '../shared/festive-2083.mjs';
test('sait instants match official Nepal civil dates and DST-aware city clocks',()=>{
 assert.equal(new Date(saits[0].at).toISOString(),'2026-10-11T06:02:00.000Z');
 assert.equal(new Date(saits[1].at).toISOString(),'2026-10-21T04:41:00.000Z');
 for(const [zone,ghat,tika] of [['Australia/Sydney','5:02 pm','3:41 pm'],['Asia/Qatar','9:02 am','7:41 am'],['Asia/Tokyo','3:02 pm','1:41 pm'],['America/New_York','2:02 am','12:41 am']]){
 assert.ok(cityTime(saits[0].at,zone).includes(ghat));assert.ok(cityTime(saits[1].at,zone).includes(tika));}
});
test('guides enrich current year only; pending Tihar sait cannot produce a fabricated countdown',()=>{
 assert.equal(festivalFeature('dashain',2082),'');assert.equal(festivalFeature('holi',2083),'');
 const d=festivalFeature('dashain',2083);assert.equal((d.match(/data-fest-countdown=/g)||[]).length,2);assert.ok(d.includes('October 19'));assert.ok(d.includes('दक्षिणकाली'));assert.ok(d.includes('पालाञ्चोक'));assert.ok(d.includes('CC BY-SA 3.0'));
 const t=festivalFeature('tihar',2083);assert.ok(t.includes('November 7–11'));assert.ok(t.includes('Sait awaiting announcement'));assert.ok(!t.includes('data-fest-countdown='));
});
test('countdown advances and expires without negative time or repeated announcements',()=>{
 const node={dataset:{festCountdown:saits[0].at},textContent:''};let now=Date.parse(saits[0].at)-1000,tick;
 vm.runInNewContext(readFileSync(new URL('../public/festive/festive-2083.js',import.meta.url),'utf8'),{document:{querySelectorAll:()=>[node]},Date:{parse:Date.parse,now:()=>now},setInterval:f=>(tick=f,1),clearInterval:()=>{},addEventListener:()=>{}});
 assert.ok(node.textContent.endsWith('01 सेकेन्ड'));now+=2000;tick();assert.ok(node.textContent.includes('Sait time reached'));assert.ok(!node.textContent.includes('-'));
});
