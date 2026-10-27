import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "jurisdiction": "Jurisdiction + claim type (verify law)",
  "accrual": "2025-01-15",
  "years": 2,
  "months": 0,
  "days": 0,
  "tolling": 0,
  "filingRule": "none"
};
describe('TOOL-0462 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Unadjusted civil-date estimate");expect(o?.value).toBe("2027-01-15");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,years:v})).toThrow();});
});
