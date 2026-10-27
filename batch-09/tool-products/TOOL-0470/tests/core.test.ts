import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "student": "Student Example",
  "grad": 2027,
  "courses": "Algebra II|1|A|2025\nBiology|1|B+|2025",
  "honors": "off"
};
describe('TOOL-0470 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Total credits");expect(o?.value).toBe("2.00");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,grad:v})).toThrow();});
});
