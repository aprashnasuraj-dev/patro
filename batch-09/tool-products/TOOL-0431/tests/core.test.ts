import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "city": "Hypothetical City (sample only)",
  "rate": 175,
  "nights": 4,
  "fee": 80,
  "localPct": 8,
  "otherPct": 2,
  "collected": 0
};
describe('TOOL-0431 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Taxable lodging base");expect(metric?.value).toBe("$780.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="rate";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="rate";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
