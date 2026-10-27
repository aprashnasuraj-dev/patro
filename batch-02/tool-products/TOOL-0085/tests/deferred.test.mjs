// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0085',async()=>{
 const result=await compute({text:'“Hello” and it’s fine',primes:'Preserve primes'});
 assert.equal(result.text,'"Hello" and it's fine');
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{text:'“Hello” and it’s fine',primes:'Preserve primes'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
