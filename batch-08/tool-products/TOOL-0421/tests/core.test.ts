import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "country": "US",
  "officeSqFt": 120,
  "homeSqFt": 1000,
  "annualCosts": 12000,
  "businessTimePct": 100,
  "months": 12,
  "businessIncome": 50000,
  "auRate": 0.7,
  "auHours": 1200
};
describe('TOOL-0421 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="US simplified estimate (USD)");expect(metric?.value).toBe("$600.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="officeSqFt";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="officeSqFt";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
