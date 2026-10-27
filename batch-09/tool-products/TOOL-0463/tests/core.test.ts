import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "page": "US Letter",
  "lines": 28,
  "left": 1.0,
  "right": 0.65,
  "top": 0.8,
  "bottom": 0.7,
  "court": "California civil trial (illustrative)"
};
describe('TOOL-0463 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Ruled lines");expect(o?.value).toBe("28");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,lines:v})).toThrow();});
});
