// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0079',async()=>{
 const result=await compute({csv:'Query,Page,Clicks,Impressions\nq,https://a.test/x,1,30\nq,https://a.test/y,2,45',min:'20'});
 assert.equal(result.metrics[1][1],1);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{csv:'Query,Page,Clicks,Impressions\nq,https://a.test/x,1,30\nq,https://a.test/y,2,45',min:'20'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
