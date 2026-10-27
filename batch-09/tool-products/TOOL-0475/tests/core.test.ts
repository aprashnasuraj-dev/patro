import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "platform": "Custom / verify product rules",
  "title": "Sample title",
  "limit": 200,
  "byteLimit": 0
};
describe('TOOL-0475 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="UTF-8 bytes");expect(o?.value).toBe("12");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,limit:v})).toThrow();});
});
