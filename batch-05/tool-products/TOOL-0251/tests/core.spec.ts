import {describe,it,expect} from 'vitest';
import {lateInterest} from '../src/core';
describe('TOOL-0251 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=lateInterest(10000,10,'2026-09-26','2026-10-26',0,365,'simple',[]);expect(Math.round(r.totalInterestGenerated*100)/100).toBe(82.19);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
