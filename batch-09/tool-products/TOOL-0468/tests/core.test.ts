import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "jurisdiction": "Verified licensing board",
  "target": 30,
  "earned": 12,
  "renewal": "2027-06-30",
  "asof": "2026-10-26",
  "monthly": 3
};
describe('TOOL-0468 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Accepted credit deficit");expect(o?.value).toBe("18.00 credits");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,target:v})).toThrow();});
});
