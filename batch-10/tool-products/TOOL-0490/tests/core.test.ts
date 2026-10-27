import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"length": 8, "height": 4, "depth": 4, "price": 350, "btu": 20, "eff": 70} as Record<string,unknown>;
describe('TOOL-0490: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='Cost per useful million BTU')?.value).toBe('$25.00');});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"length":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"length":1e99})).toThrow();});

 it('calculates one cord from a 4x4x8-ft stack',()=>expect(calculate(sample).outputs.find(o=>o.label==='Equivalent full cords')?.value).toBe('1.00 cords'));
});
