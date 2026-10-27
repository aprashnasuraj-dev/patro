import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"shape": "Rectangle", "unit": "in", "length": 72, "width": 30, "drop": 10, "height": 30} as Record<string,unknown>;
describe('TOOL-0484: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='Cloth width')?.value).toBe('50.00 in');});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"length":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"length":1e99})).toThrow();});

 it('warns about floor-reaching cloth',()=>expect(calculate({...sample,drop:30}).warnings.join()).toMatch(/floor/));
});
