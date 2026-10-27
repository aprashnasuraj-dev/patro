import {describe,it,expect} from 'vitest';
import {breakEven} from '../src/core';
describe('TOOL-0245 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=breakEven(20000,80,45,0,1000);expect(r.contribution).toBe(35);expect(Math.round(r.breakEvenUnits*100)/100).toBe(571.43);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
