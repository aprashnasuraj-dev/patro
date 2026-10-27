import {describe,it,expect} from 'vitest';
import {vatOne} from '../src/core';
describe('TOOL-0248 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{expect(vatOne(120,20,'inclusive',2)).toMatchObject({net:100,tax:20,gross:120});expect(vatOne(100,20,'exclusive',2).gross).toBe(120);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
