import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "loadedTrailer": 5000,
  "tonguePct": 12,
  "truckPayload": 1600,
  "occupants": 600,
  "hitchLimit": 900,
  "towRating": 7000,
  "gcwr": 15000,
  "truckGVWWithoutTongue": 7300
};
describe('TOOL-0433 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Estimated tongue load");expect(metric?.value).toBe("600.00 lb"); });
 it('rejects NaN and numeric overflow',()=>{ const key="loadedTrailer";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="loadedTrailer";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
