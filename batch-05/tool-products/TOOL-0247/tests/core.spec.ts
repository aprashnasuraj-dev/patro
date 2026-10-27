import {describe,it,expect} from 'vitest';
import {startupRunway} from '../src/core';
describe('TOOL-0247 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=startupRunway(300000,40000,90000,0,0,[]);expect(r.currentNetBurn).toBe(50000);expect(r.simpleRunwayMonths).toBe(6);expect(r.depletionMonth).toBe(6);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
