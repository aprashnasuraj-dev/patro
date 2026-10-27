import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "deposit": 1200,
  "received": "2026-06-01",
  "protected": ""
};
describe('TOOL-0429 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Illustrative maximum award (3\u00d7)");expect(metric?.value).toBe("\u00a33,600.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="deposit";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="deposit";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
