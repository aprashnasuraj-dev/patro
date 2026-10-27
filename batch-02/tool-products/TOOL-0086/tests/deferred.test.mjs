// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0086',async()=>{
 const result=await compute({text:'a\r\nb\nc\r',style:'LF',trailing:'Preserve'});
 assert.equal(result.text,'a\nb\nc\n');assert.equal(result.metrics[0][1],1);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{text:'a\r\nb\nc\r',style:'LF',trailing:'Preserve'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
