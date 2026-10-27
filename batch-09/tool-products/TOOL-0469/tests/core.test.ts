import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "state": "State / class",
  "target": 50,
  "nightTarget": 10,
  "sessions": "2026-09-01,90,30\n2026-09-02,120,0"
};
describe('TOOL-0469 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Total logged hours");expect(o?.value).toBe("3.50");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
 it('rejects nonfinite, oversized and nonnumeric values',()=>{for(const v of ['NaN','Infinity','1e309',{},null,''])expect(()=>calculate({...sample,target:v})).toThrow();});
});
