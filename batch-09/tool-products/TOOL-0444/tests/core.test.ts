import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "w": 4000,
  "h": 3000,
  "ppi": 300,
  "bleed": 0
};
describe('TOOL-0444 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Maximum canvas at entered PPI");expect(actual?.value).toBe("13.33 \u00d7 10.00 in"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="w";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="w";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects bleed exceeding small print dimensions',()=>expect(()=>calculate({...sample,w:10,h:10,bleed:20})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
