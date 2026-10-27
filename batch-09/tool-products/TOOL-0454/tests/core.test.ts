import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "start": "2026-11-01",
  "units": 60,
  "daily": 2,
  "lead": 7,
  "other": 0
};
describe('TOOL-0454 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Full days of supply");expect(actual?.value).toBe("30"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="units";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="units";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects supply extending beyond supported horizon',()=>expect(()=>calculate({...sample,units:100000,daily:.01})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
