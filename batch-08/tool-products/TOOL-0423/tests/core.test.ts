import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "jurisdiction": "User-verified rule",
  "current": 1500,
  "proposed": 1600,
  "capPct": 5,
  "minDays": 60,
  "served": "2026-11-01",
  "starts": "2027-01-01"
};
describe('TOOL-0423 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Rule-entered maximum rent");expect(metric?.value).toBe("$1,575.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="current";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="current";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
