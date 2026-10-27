// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0078',async()=>{
 const result=await compute({csv:'source,target\nhttps://example.com/a,https://example.com/b\nhttps://example.com/b,https://example.com/c\nhttps://example.com/x,https://example.com/y\nhttps://example.com/y,https://example.com/x'});
 assert.equal(result.metrics[2][1],2);assert.ok(result.rows.some(x=>x.status==='CHAIN'));
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{csv:'source,target\nhttps://example.com/a,https://example.com/b\nhttps://example.com/b,https://example.com/c\nhttps://example.com/x,https://example.com/y\nhttps://example.com/y,https://example.com/x'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
