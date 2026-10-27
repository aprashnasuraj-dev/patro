import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const defaults = {
  "regime": "US",
  "driveToday": 6,
  "sinceBreak": 3,
  "shiftElapsed": 9,
  "dutyCycleBefore": 42,
  "dutyThisShift": 9,
  "weekDrive": 29,
  "fortnightDrive": 64
};
describe('TOOL-0436 deterministic core (DEFERRED)',()=>{
 it('matches manually calculated reference output',()=>{ const result=calculate(defaults);const metric=result.outputs.find(x=>x.label==="Conservative next uninterrupted driving window");expect(metric?.value).toBe("5.00 h"); });
 it('rejects NaN and numeric overflow',()=>{ const key="driveToday";expect(()=>calculate({...defaults,[key]:Number.POSITIVE_INFINITY})).toThrow();expect(()=>calculate({...defaults,[key]:'NaN'})).toThrow(); });
 it('rejects missing mandatory numeric inputs',()=>{const key="driveToday";expect(()=>calculate({...defaults,[key]:''})).toThrow();});
 it('provides explanation and no empty results',()=>{const r=calculate(defaults);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
