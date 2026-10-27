// Deferred browser QA: Canvas TextMetrics and Worker deadline need real browser harness.
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const cases=JSON.parse(readFileSync(new URL('./cases.json',import.meta.url),'utf8'));
test('deferred scenario list includes UI and domain tests',()=>{assert(cases.some(s=>s.id==='responsive'));assert(cases.some(s=>s.id==='security'));assert(cases.some(s=>s.id==='domain-1'));});
test.skip('real browser canvas/regex worker QA pending',()=>{});
