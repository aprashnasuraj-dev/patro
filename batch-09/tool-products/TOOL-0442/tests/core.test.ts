import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "width": 210,
  "height": 297,
  "bleed": 3,
  "safe": 5,
  "dpi": 300
};
describe('TOOL-0442 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Full artwork canvas");expect(actual?.value).toBe("216.00 \u00d7 303.00 mm"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="width";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="width";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects impossible interior safe inset',()=>expect(()=>calculate({...sample,width:50,safe:30})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
