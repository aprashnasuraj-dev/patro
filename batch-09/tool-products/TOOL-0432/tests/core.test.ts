import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "rent": 3000,
  "commonSharePct": 40,
  "rooms": "[{\"name\":\"A\",\"sqft\":150,\"adjustment\":100},{\"name\":\"B\",\"sqft\":120,\"adjustment\":0},{\"name\":\"C\",\"sqft\":100,\"adjustment\":-100}]"
};
describe('TOOL-0432 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="A \u00b7 monthly rent");expect(metric?.value).toBe("$1,229.73"); });
 it('rejects NaN and numeric overflow',()=>{ const key="rent";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="rent";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
