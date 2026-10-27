import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "provider": "KDP",
  "stock": "white",
  "pages": 200,
  "trimW": 6,
  "trimH": 9,
  "caliper": 0.0025,
  "bleed": 0.125
};
describe('TOOL-0443 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Calculated spine width");expect(actual?.value).toBe("0.4504 in"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="pages";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="pages";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects odd final book page count',()=>expect(()=>calculate({...sample,pages:201})).toThrow());
 it('requires ≥72 pages for KDP standard color',()=>expect(()=>calculate({...sample,stock:'standard-color',pages:40})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
