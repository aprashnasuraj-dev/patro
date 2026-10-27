import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "maxPixels": 20000000,
  "targetW": 1600,
  "targetH": 1600,
  "mode": "contain",
  "format": "image/jpeg"
};
describe('TOOL-0476 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Output canvas");expect(o?.value).toBe("1,600 \u00d7 1,600 px");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,maxPixels:v})).toThrow();});
});
