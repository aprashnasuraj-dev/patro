import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"unit": "ft", "length": 8, "width": 4, "depth": 1, "beds": 2, "compost": 35, "extra": 10, "bag": 40} as Record<string,unknown>;
describe('TOOL-0487: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='Compost')).toBeDefined();});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"length":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"length":1e99})).toThrow();});

 it('rejects fractional bed count',()=>expect(()=>calculate({...sample,beds:1.5})).toThrow());
});
