import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "miles": 40,
  "vehicleKwh100": 30,
  "effPct": 88,
  "price": 0.2,
  "chargerKw": 7.2,
  "voltage": 240,
  "breakerAmps": 40
};
describe('TOOL-0434 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Grid electricity per day");expect(metric?.value).toBe("13.64 kWh"); });
 it('rejects NaN and numeric overflow',()=>{ const key="miles";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="miles";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
