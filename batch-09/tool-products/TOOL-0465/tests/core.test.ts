import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "system": "4.0 course-point entries",
  "data": "Math|3|3.7\nScience|4|3.3",
  "boundary": 90,
  "scale": 4
};
describe('TOOL-0465 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Total credits");expect(o?.value).toBe("7.00");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,boundary:v})).toThrow();});
});
