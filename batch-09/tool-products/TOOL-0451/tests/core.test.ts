import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "shape": "rectangular",
  "length": 80,
  "width": 35,
  "height": 40,
  "displacement": 8,
  "change": 25,
  "dosePer100": 10,
  "doseScope": "new-water"
};
describe('TOOL-0451 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Estimated actual water volume");expect(actual?.value).toBe("103.04 L"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="length";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="length";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects unsupported tank shapes',()=>expect(()=>calculate({...sample,shape:'sphere'})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
