import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "hire": "2022-04-15",
  "termination": "2026-10-20",
  "category": "EAD / expiring employment authorization",
  "expires": "2026-12-01"
};
describe('TOOL-0459 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Retain I-9 through at least");expect(actual?.value).toBe("2027-10-20"); });
 it('rejects missing required dates',()=>{expect(()=>calculate({...sample,hire:'2026-02-30'})).toThrow();});
 it('rejects termination predating hire',()=>expect(()=>calculate({...sample,termination:'2000-01-01'})).toThrow());
 it('does not mandate I-9 reverification for a U.S. citizen',()=>expect(calculate({...sample,category:'US citizen / passport'}).outputs.find(x=>x.label==='Reverification status')?.value).toContain('Do NOT reverify'));
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
