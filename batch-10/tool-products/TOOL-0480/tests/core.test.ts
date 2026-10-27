import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "year": 2026,
  "type": "Third-party app or marketplace",
  "gross": 21000,
  "transactions": 205,
  "state": "Other / not verified",
  "platform": "Marketplace / app"
};
describe('TOOL-0480 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Federal 1099-K reporting trigger");expect(o?.value).toBe("Meets baseline");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,year:v})).toThrow();});
});
