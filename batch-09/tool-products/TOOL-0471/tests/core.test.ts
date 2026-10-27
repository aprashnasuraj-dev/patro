import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "direction": "quarter → semester",
  "credits": 45,
  "ratio": 0.6666666666666666,
  "round": 2
};
describe('TOOL-0471 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Converted credits");expect(o?.value).toBe("30.00");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,credits:v})).toThrow();});
});
