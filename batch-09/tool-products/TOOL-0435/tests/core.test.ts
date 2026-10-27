import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "index": 91,
  "speed": "H"
};
describe('TOOL-0435 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Nominal maximum load per tire");expect(metric?.value).toBe("615 kg / 1,356 lb"); });
 it('rejects NaN and numeric overflow',()=>{ const key="index";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="index";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
