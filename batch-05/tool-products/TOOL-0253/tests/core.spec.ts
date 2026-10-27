import {describe,it,expect} from 'vitest';
import {employeeCost} from '../src/core';
describe('TOOL-0253 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=employeeCost({salary:100000,bonusPct:0,payrollPct:0,retirementPct:0,benefits:0,insurance:0,equipment:0,training:0,monthlySoftwareWorkspace:0,recruitingCost:0,recruitingAmortMonths:12,productivePct:100,weeks:50,hoursPerWeek:40});expect(r.annualLoadedCost).toBe(100000);expect(r.scheduledHourlyCost).toBe(50);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
