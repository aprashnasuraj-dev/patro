import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "monthly": 1800,
  "months": 7,
  "fee": 2000,
  "reletting": 700,
  "deposit": 0,
  "concessions": 0
};
describe('TOOL-0427 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Remaining scheduled rent");expect(metric?.value).toBe("$12,600.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="monthly";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="monthly";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
