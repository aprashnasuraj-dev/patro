import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "species": "dog",
  "brand": "Example Adult Maintenance",
  "calories": 360,
  "gramsPerCup": 100,
  "dailyKcal": 540,
  "bagKg": 2.5,
  "bagCost": 30,
  "treatPct": 10
};
describe('TOOL-0450 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Food servings per day");expect(actual?.value).toBe("1.35 cups"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="calories";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="calories";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing package calories',()=>expect(()=>calculate({...sample,calories:0})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
