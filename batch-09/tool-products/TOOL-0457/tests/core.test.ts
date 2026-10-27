import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "jurisdiction": "User verified",
  "end": "2026-10-31",
  "method": "regular-payday",
  "payday": "2026-11-06",
  "days": 0,
  "unpaid": 2000,
  "ptoHours": 20,
  "ptoRate": 25
};
describe('TOOL-0457 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="User-confirmed payable PTO");expect(actual?.value).toBe("$500.00"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="days";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="days";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects regular pay date before last employment day',()=>expect(()=>calculate({...sample,payday:'2026-10-01'})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
