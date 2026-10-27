import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "covered": "yes",
  "months": 18,
  "worked": 1600,
  "site": 75,
  "normal": 40,
  "used": 3,
  "special": "standard"
};
describe('TOOL-0460 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Standard remaining workweeks if eligible");expect(actual?.value).toBe("9.00 workweeks"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="months";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="months";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects unsupported special classification',()=>expect(()=>calculate({...sample,special:'airline-crew'})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
