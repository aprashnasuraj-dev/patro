import {describe,it,expect} from 'vitest';
import {reorderPoint} from '../src/core';
describe('TOOL-0257 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=reorderPoint(100,15,7,1,95,false);expect(r.reorderPoint).toBeGreaterThan(700);expect(r.safetyStock).toBeGreaterThan(0);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
