import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "assessed": 350000,
  "proposed": 310000,
  "rate": 18,
  "success": 50,
  "filing": 250
};
describe('TOOL-0428 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Best-case annual tax difference");expect(metric?.value).toBe("$720.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="assessed";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="assessed";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
