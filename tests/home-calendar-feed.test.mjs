import test from 'node:test';
import assert from 'node:assert/strict';
import {festivalFeed,foldIcs} from '../src/home-calendar-feed.mjs';
test('all-day feed uses exclusive end, stable ids, deduplication and escaped text',()=>{
 const events=[{date:'2026-12-31',id:'one',name:'चाड, पर्व;\nBEGIN:VEVENT'},{date:'2026-12-31',id:'one',name:'duplicate'}];
 const text=festivalFeed(events,'2026-10-24');assert.equal((text.match(/^BEGIN:VEVENT\r?$/gm)||[]).length,1);assert.ok(text.includes('DTEND;VALUE=DATE:20270101'));assert.ok(text.includes('UID:one@aafnaipatro.com'));assert.ok(text.includes('SUMMARY:चाड\\, पर्व\\;\\nBEGIN:VEVENT'));assert.ok(text.endsWith('END:VCALENDAR\r\n'));
});
test('folding stays within 75 UTF-8 octets and retains complete Nepali text',()=>{
 const line='SUMMARY:'+ 'कात्तिकको चाडपर्व '.repeat(20);const folded=foldIcs(line);for(const part of folded.split('\r\n'))assert.ok(Buffer.byteLength(part)<=75);assert.equal(folded.replaceAll('\r\n ',''),line);
});
