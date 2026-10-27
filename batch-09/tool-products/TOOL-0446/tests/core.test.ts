import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "sheetW": 210,
  "sheetH": 297,
  "cols": 3,
  "rows": 8,
  "labelW": 63.5,
  "labelH": 33.9,
  "left": 7,
  "top": 12,
  "gapX": 2.5,
  "gapY": 0,
  "offsetX": 0,
  "offsetY": 0
};
describe('TOOL-0446 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Total labels per sheet");expect(actual?.value).toBe("24"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="sheetW";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="sheetW";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects grids that exceed printable sheet boundaries',()=>expect(()=>calculate({...sample,cols:30,rows:40})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
