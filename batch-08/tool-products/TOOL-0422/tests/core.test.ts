import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "salary": 90000,
  "benefits": 18000,
  "overhead": 12000,
  "weeks": 46,
  "hours": 30,
  "extraTaxPct": 8,
  "contingencyPct": 10
};
describe('TOOL-0422 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Annual billable hours");expect(metric?.value).toBe("1,380"); });
 it('rejects NaN and numeric overflow',()=>{ const key="salary";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="salary";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
