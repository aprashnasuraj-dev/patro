// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0088',async()=>{
 const result=await compute({pattern:'(a+)+$',flags:'g'});
 assert.match(result.summary,/HIGH HEURISTIC/);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{pattern:'(a+)+$',flags:'g'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
