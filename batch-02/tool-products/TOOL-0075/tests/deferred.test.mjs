// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0075',async()=>{
 const result=await compute({csv:'url\nhttps://example.com/',source:'mail',medium:'email',campaign:'fall'});
 assert.match(result.text,/utm_source=mail/);assert.match(result.text,/utm_campaign=fall/);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{csv:'url\nhttps://example.com/',source:'mail',medium:'email',campaign:'fall'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
