import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"protein": "Whole pork roast", "serve": "2026-11-01T18:00", "cookHours": 8, "prep": 45, "rest": 60, "buffer": 90, "target": 203} as Record<string,unknown>;
describe('TOOL-0485: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='USDA minimum internal temperature')?.value).toBe('145°F');});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"cookHours":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"cookHours":1e99})).toThrow();});

 it('rejects below-safe temperature',()=>expect(()=>calculate({...sample,protein:'Poultry',target:145})).toThrow());
});
