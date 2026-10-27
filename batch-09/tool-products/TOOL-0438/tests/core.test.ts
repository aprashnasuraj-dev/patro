import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "gross": 1700,
  "fees": 170,
  "miles": 650,
  "fuel": 0.13,
  "wear": 0.22,
  "fixed": 100,
  "hours": 45,
  "reserve": 20
};
describe('TOOL-0438 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Economic net after user tax reserve");expect(metric?.value).toBe("$962.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="gross";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="gross";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
