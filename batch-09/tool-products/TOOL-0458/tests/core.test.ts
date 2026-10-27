import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "mode": "hourly",
  "hours": 48,
  "rate": 25,
  "fixed": 950,
  "bonus": 0,
  "min": 7.25,
  "fwwOK": "no"
};
describe('TOOL-0458 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Overtime hours above 40");expect(actual?.value).toBe("8.00"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="hours";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="hours";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects unverified fluctuating workweek use',()=>expect(()=>calculate({...sample,mode:'fluctuating-week'})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
