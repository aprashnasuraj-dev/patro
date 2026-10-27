// Authoritative source-based deferred tests. Not executed during Drive preparation.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0080',async()=>{
 const result=await compute({name:'Meetup',start:'2026-11-15T18:00:00+05:45',end:'2026-11-15T20:00:00+05:45',mode:'Hybrid',venue:'Hall',address:'City, NP',online:'https://example.com/live'});
 assert.equal(JSON.parse(result.text).location.length,2);
});
test('bounded malformed or oversized input is rejected',async()=>{
 const bad='a'.repeat(9000000);
 await assert.rejects(async()=>await compute({...{name:'Meetup',start:'2026-11-15T18:00:00+05:45',end:'2026-11-15T20:00:00+05:45',mode:'Hybrid',venue:'Hall',address:'City, NP',online:'https://example.com/live'},text:bad,urls:bad,csv:bad,pattern:bad}));
});
