import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "sphere": -6,
  "cyl": -1.5,
  "axis": 180,
  "vertex": 12
};
describe('TOOL-0453 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Theoretical corneal-plane sphere");expect(actual?.value).toBe("-5.60 D"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="sphere";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="sphere";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects invalid principal-meridian axis',()=>expect(()=>calculate({...sample,axis:0})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
