import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "jurisdiction": "Verify state and window",
  "window": "front-side",
  "original": 75,
  "film": 35,
  "minimum": 35,
  "tolerance": 0
};
describe('TOOL-0440 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Calculated net visible light transmission");expect(metric?.value).toBe("26.25%"); });
 it('rejects NaN and numeric overflow',()=>{ const key="original";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="original";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
