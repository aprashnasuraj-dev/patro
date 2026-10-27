import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"country": "Spain", "employment": "Employee", "external": "Yes", "monthly": 4200, "dependents": 0, "spainClient": 0, "months": 12, "portugalThreshold": 0} as Record<string,unknown>;
describe('TOOL-0486: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='Indicative income requirement')?.value).toBe('€2,442.00/month');});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"monthly":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"monthly":1e99})).toThrow();});

 it('flags false visa certainty',()=>expect(calculate(sample).warnings.join()).toMatch(/No visa outcome/));
});
