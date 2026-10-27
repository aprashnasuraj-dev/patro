// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0082',async()=>{
 const result=await compute({text:'pаypal',reference:'paypal'});
 assert.ok(result.metrics[0][1]>0);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{text:'pаypal',reference:'paypal'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
