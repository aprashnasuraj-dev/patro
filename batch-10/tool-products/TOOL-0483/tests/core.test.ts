import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"length": 60, "width": 40, "unavailable": 300, "layout": "Tables and chairs", "planning": 18, "approved": 0} as Record<string,unknown>;
describe('TOOL-0483: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='Factor-based number')?.value).toBe('140');});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"length":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"length":1e99})).toThrow();});

 it('rejects a stage larger than the room',()=>expect(()=>calculate({...sample,unavailable:3000})).toThrow());
});
