import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "cap": 36000,
  "residual": 24000,
  "factor": 0.002,
  "months": 36,
  "taxPct": 8,
  "upfront": 2500,
  "endFee": 395
};
describe('TOOL-0439 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Approximate APR equivalent");expect(metric?.value).toBe("4.80%"); });
 it('rejects NaN and numeric overflow',()=>{ const key="cap";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="cap";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
