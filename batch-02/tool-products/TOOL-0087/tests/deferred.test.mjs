// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0087',async()=>{
 const result=await compute({before:'red blue',after:'red green'});
 assert.ok(result.changes.some(v=>v.kind==='removed'));assert.ok(result.changes.some(v=>v.kind==='added'));
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{before:'red blue',after:'red green'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
