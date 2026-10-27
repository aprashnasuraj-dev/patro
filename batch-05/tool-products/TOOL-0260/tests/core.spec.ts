import {describe,it,expect} from 'vitest';
import {proRata} from '../src/core';
describe('TOOL-0260 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=proRata(60000,40,30,5,4,25,'2026-01-01','2026-12-31','calendar');expect(r.salaryFte).toBe(.75);expect(r.annualizedSalary).toBe(45000);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
