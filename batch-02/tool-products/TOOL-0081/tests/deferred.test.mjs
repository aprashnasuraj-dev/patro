// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0081',async()=>{
 const result=await compute({text:'a\u200bb',remove:false});
 assert.equal(result.metrics[0][1],1);assert.match(result.text,/U\+200B/);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{text:'a\u200bb',remove:false},text:bad,urls:bad,csv:bad,pattern:bad}));
});
