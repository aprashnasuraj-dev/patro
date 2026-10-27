import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "start": "2026-11-01",
  "trays": 18,
  "days": 10,
  "pause": 0,
  "wearHours": 22
};
describe('TOOL-0455 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Total calendar-day interval");expect(actual?.value).toBe("180 days"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="trays";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="trays";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects schedules longer than 1000 days',()=>expect(()=>calculate({...sample,trays:60,days:60})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
