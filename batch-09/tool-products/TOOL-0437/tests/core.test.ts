import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "quarter": "2026-Q3",
  "fuelGallons": 1000,
  "records": "[{\"code\":\"A\",\"miles\":3000,\"ratePerGallon\":0.4,\"taxedGallonsPurchased\":300},{\"code\":\"B\",\"miles\":4000,\"ratePerGallon\":0.5,\"taxedGallonsPurchased\":700}]"
};
describe('TOOL-0437 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Fleet quarter economy (US MPG)");expect(metric?.value).toBe("7.00"); });
 it('rejects NaN and numeric overflow',()=>{ const key="fuelGallons";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="fuelGallons";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
