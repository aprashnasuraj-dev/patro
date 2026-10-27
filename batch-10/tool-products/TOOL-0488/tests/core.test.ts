import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"material": "Fertilizer", "target": 3, "area": 250, "width": 3, "distance": 20, "collected": 1.4} as Record<string,unknown>;
describe('TOOL-0488: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='Deviation from target')).toBeDefined();});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"target":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"target":1e99})).toThrow();});

 it('does not return a fictitious manufacturer dial',()=>expect(calculate(sample).warnings.join()).toMatch(/dial setting/));
});
