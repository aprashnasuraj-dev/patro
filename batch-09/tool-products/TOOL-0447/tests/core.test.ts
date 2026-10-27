import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "stitchesW": 180,
  "stitchesH": 140,
  "count": 28,
  "over": 2,
  "border": 3,
  "waste": 0
};
describe('TOOL-0447 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Finished stitched motif");expect(actual?.value).toBe("12.86 \u00d7 10.00 in"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="stitchesW";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="stitchesW";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects non-integral threads crossed per stitch',()=>expect(()=>calculate({...sample,over:1.5})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
