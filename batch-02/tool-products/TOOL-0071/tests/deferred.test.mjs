// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0071',async()=>{
 const result=await compute({urls:'https://example.com/a\nhttps://example.com/b',chunk:'1',base:'https://example.com/'});
 assert.equal(result.files.length,3); assert.equal(result.metrics[1][1],2); assert.match(result.text,/sitemap-001\.xml/);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{urls:'https://example.com/a\nhttps://example.com/b',chunk:'1',base:'https://example.com/'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
