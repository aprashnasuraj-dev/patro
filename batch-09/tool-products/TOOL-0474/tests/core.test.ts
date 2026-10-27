import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "origin": "Country of origin (verify)",
  "destination": "Destination country (verify)",
  "value": 1000,
  "freight": 120,
  "insurance": 20,
  "duty": 10,
  "tax": 5,
  "taxFreight": "yes",
  "fees": 35
};
describe('TOOL-0474 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Modeled import duty");expect(o?.value).toBe("$100.00");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,value:v})).toThrow();});
});
