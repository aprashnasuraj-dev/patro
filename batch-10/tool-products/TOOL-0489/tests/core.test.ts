import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"area": 2000, "target": 1, "rain": 0.25, "eff": 80, "flow": 8, "zones": 4, "cycles": 2} as Record<string,unknown>;
describe('TOOL-0489: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='Net irrigation depth')?.value).toBe('0.75 in');});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"area":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"area":1e99})).toThrow();});

 it('returns zero runtime when rain covers target',()=>expect(calculate({...sample,rain:2}).outputs.find(o=>o.label==='Runtime per zone per week')?.value).toContain('0.00'));
});
