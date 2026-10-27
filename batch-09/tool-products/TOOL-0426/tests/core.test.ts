import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "purchase": 400000,
  "land": 100000,
  "improvements": 0,
  "years": 5,
  "sale": 450000
};
describe('TOOL-0426 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Full-year straight-line depreciation");expect(metric?.value).toBe("$10,909.09"); });
 it('rejects NaN and numeric overflow',()=>{ const key="purchase";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="purchase";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
