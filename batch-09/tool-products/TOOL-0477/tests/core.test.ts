import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "pallet": "US GMA 48×40 in",
  "cartonL": 16,
  "cartonW": 12,
  "cartonH": 10,
  "cartonWeight": 20,
  "maxHeight": 60,
  "palletHeight": 6,
  "payload": 2000
};
describe('TOOL-0477 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Maximum modeled cartons");expect(o?.value).toBe("48");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,cartonL:v})).toThrow();});
});
