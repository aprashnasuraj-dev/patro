import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "state": "State electrician board (verify)",
  "required": 8000,
  "logged": 6000,
  "entries": "2026-10-01,8,field\n2026-10-02,6,classroom",
  "dailyCap": 16
};
describe('TOOL-0472 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="New field hours");expect(o?.value).toBe("8.00");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,required:v})).toThrow();});
});
