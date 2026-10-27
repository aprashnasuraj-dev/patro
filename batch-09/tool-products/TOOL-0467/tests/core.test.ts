import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "start": "2026-11-01",
  "exam": "2027-01-31",
  "weekdays": "123456",
  "hours": 2,
  "topic1": 50,
  "topic2": 30,
  "topic3": 20,
  "needed": 120
};
describe('TOOL-0467 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Eligible study days");expect(o?.value).toBe("78");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,hours:v})).toThrow();});
});
