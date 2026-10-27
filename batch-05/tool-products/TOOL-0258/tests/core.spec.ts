import {describe,it,expect} from 'vitest';
import {gtinCheckDigit,normalizeBarcode} from '../src/core';
describe('TOOL-0258 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{expect(gtinCheckDigit('400638133393')).toBe('1');expect(normalizeBarcode('EAN13','400638133393').value).toBe('4006381333931');});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
