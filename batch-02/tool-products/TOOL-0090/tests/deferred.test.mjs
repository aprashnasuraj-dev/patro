// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0090',async()=>{
 const result=await compute({text:'a\nb\na',trim:false,caseSensitive:true,blanks:false});
 assert.equal(result.metrics[1][1],1);assert.match(result.text,/2,\"a\"/);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{text:'a\nb\na',trim:false,caseSensitive:true,blanks:false},text:bad,urls:bad,csv:bad,pattern:bad}));
});
