import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "jurisdiction": "England - ground-specific",
  "served": "2026-11-01",
  "serviceLag": 2,
  "noticeDays": 60,
  "proposed": "2027-01-10"
};
describe('TOOL-0425 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Assumed legal service date");expect(metric?.value).toBe("2026-11-03"); });
 it('rejects NaN and numeric overflow',()=>{ const key="serviceLag";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="serviceLag";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
