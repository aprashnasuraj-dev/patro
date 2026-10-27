import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "jurisdiction": "Local rule required",
  "deposit": 1800,
  "damage": 150,
  "arrears": 0,
  "other": 0,
  "days": 30,
  "trigger": "2026-11-01"
};
describe('TOOL-0424 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Estimated amount to return");expect(metric?.value).toBe("$1,650.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="deposit";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="deposit";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
