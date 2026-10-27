import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "x": 0,
  "y": 0,
  "width": 288,
  "height": 432,
  "page": 1,
  "rotate": "portrait"
};
describe('TOOL-0478 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Output page size");expect(o?.value).toBe("288 \u00d7 432 PDF points");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,x:v})).toThrow();});
});
