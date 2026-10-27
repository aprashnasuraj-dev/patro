// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0076',async()=>{
 const result=await compute({urls:'https://example.com/?utm_source=mail&item=4&fbclid=x',utm:'Remove UTM'});
 assert.match(result.text,/item=4/);assert.doesNotMatch(result.text,/utm_source|fbclid/);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{urls:'https://example.com/?utm_source=mail&item=4&fbclid=x',utm:'Remove UTM'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
