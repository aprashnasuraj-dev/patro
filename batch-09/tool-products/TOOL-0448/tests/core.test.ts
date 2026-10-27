import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "originalSkeins": 6,
  "originalMeters": 100,
  "replacementMeters": 125,
  "waste": 12,
  "price": 6.5
};
describe('TOOL-0448 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Substitute skeins to purchase");expect(actual?.value).toBe("6"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="originalSkeins";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="originalSkeins";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects impossible original skein count',()=>expect(()=>calculate({...sample,originalSkeins:0})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
