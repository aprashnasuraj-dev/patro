// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0073',async()=>{
 const result=await compute({title:'Home',description:'Example website',url:'https://example.com/',image:'https://example.com/a.png',type:'website'});
 assert.match(result.text,/og:title/); assert.match(result.text,/og:image/);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{title:'Home',description:'Example website',url:'https://example.com/',image:'https://example.com/a.png',type:'website'},title:bad}));
});
