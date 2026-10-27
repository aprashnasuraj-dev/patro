import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "replacement": 600,
  "life": 8,
  "age": 5,
  "repair": 450,
  "damagePct": 100
};
describe('TOOL-0430 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Remaining assumed item value");expect(metric?.value).toBe("$225.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="replacement";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="replacement";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
