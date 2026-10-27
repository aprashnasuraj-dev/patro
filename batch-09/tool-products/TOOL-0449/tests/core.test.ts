import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "coverageEnd": "2026-10-31",
  "notice": "2026-11-10",
  "elect": "",
  "noticeRule": "yes"
};
describe('TOOL-0449 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="60-day election deadline");expect(actual?.value).toBe("2027-01-09"); });
 it('rejects missing required dates',()=>{expect(()=>calculate({...sample,coverageEnd:'2026-02-30'})).toThrow();});
 it('rejects unknown coverage applicability',()=>expect(()=>calculate({...sample,noticeRule:'unknown'})).toThrow());
 it('requires election on or after the later window start',()=>expect(()=>calculate({...sample,elect:'2026-10-01'})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
