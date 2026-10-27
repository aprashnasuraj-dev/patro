import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "program": "User-verified program",
  "weekly": 1200,
  "rate": 65,
  "cap": 1000,
  "weeks": 10,
  "waiting": 0,
  "employerPay": 0
};
describe('TOOL-0456 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Estimated public benefit");expect(actual?.value).toBe("$7,800.00"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="weekly";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="weekly";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects waiting period longer than approved leave',()=>expect(()=>calculate({...sample,waiting:11})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
