// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0072',async()=>{
 const result=await compute({robots:'User-agent: *\nDisallow: /secret\nAllow: /secret/open',agent:'Googlebot',urls:'https://example.com/secret\nhttps://example.com/secret/open'});
 assert.equal(result.metrics[1][1],1); assert.match(result.text,/BLOCK/); assert.match(result.text,/ALLOW/);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{robots:'User-agent: *\nDisallow: /secret\nAllow: /secret/open',agent:'Googlebot',urls:'https://example.com/secret\nhttps://example.com/secret/open'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
