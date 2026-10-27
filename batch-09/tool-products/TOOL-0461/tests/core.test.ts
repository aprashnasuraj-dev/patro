import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "hours": 200000,
  "recordable": 5,
  "dart": 3,
  "benchmark": "2024 US private industry aggregate",
  "industry": "",
  "blsTRIR": 2.3,
  "blsDART": 1.4
};
describe('TOOL-0461 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="TRIR per 100 FTE");expect(o?.value).toBe("5.00");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,hours:v})).toThrow();});
});
