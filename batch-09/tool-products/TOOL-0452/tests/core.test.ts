import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "poolL": 50000,
  "current": 1,
  "target": 3,
  "percent": 10,
  "density": 1.16,
  "stabilized": "no"
};
describe('TOOL-0452 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Available chlorine mass needed");expect(actual?.value).toBe("100.00 g"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="poolL";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="poolL";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('never suggests a negative chemical dose if current ≥ target',()=>expect(calculate({...sample,current:5,target:3}).outputs.find(x=>x.label==='Available chlorine mass needed')?.value).toBe('0.00 g'));
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
