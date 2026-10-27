import {describe,it,expect} from 'vitest';
import {marginMarkup} from '../src/core';
describe('TOOL-0244 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=marginMarkup(60,100,40,66.6666667);expect(r.marginPct).toBe(40);expect(Math.round(r.markupPct as number)).toBe(67);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
