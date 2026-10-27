import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "length": 30,
  "width": 20,
  "height": 12,
  "weight": 25,
  "divisor": 139,
  "maxLongest": 108,
  "maxGirth": 165,
  "handling": 0
};
describe('TOOL-0473 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Rounded dimensional weight");expect(o?.value).toBe("52 lb");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,length:v})).toThrow();});
});
