import {describe,it,expect} from 'vitest';
import {numberToWords} from '../src/core';
describe('TOOL-0249 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{expect(numberToWords('1234.56','international','Dollar','Dollars','Cent','Cents').text).toBe('One Thousand Two Hundred Thirty-Four Dollars and Fifty-Six Cents Only');});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
