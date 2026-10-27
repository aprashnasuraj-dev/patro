import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"spend": 250, "sales": 1000, "margin": 45, "fees": 12, "fixed": 0} as Record<string,unknown>;
describe('TOOL-0482: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='ROAS')?.value).toBe('4.00×');});
 
  it('rejects non-finite / malformed numeric input',()=>{for(const invalid of ['NaN','Infinity','1e309','',null,{}])expect(()=>calculate({...sample,"spend":invalid})).toThrow();});
  it('rejects oversized physical or monetary input',()=>{expect(()=>calculate({...sample,"spend":1e99})).toThrow();});

 it('handles zero spend without division by zero',()=>{expect(calculate({...sample,spend:0}).outputs.find(o=>o.label==='ROAS')?.value).toMatch(/Undefined/);});
});
