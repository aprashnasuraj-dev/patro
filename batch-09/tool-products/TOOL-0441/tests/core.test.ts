import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "platform": "Custom",
  "w": 1080,
  "h": 1920,
  "top": 12,
  "bottom": 23,
  "left": 8,
  "right": 16,
  "message": "Headline appears here"
};
describe('TOOL-0441 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Safe rectangle");expect(actual?.value).toBe("821 \u00d7 1,248 px"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="w";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="w";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects safety area totals over 95%',()=>expect(()=>calculate({...sample,top:49,bottom:49})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
