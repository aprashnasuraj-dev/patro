import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
test('known-answer: TOOL-0085',async()=>{const result=await compute({text:'“Hello” and it’s fine',primes:'Preserve primes'});assert.equal(result.text,`"Hello" and it's fine`);});
test('bounded oversized input is rejected',async()=>{const bad='a'.repeat(9000000);await assert.rejects(async()=>await compute({text:bad,primes:'Preserve primes'}));});
