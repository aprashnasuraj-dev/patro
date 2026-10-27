import {describe,it,expect} from 'vitest';
import {saasMetrics} from '../src/core';
describe('TOOL-0246 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=saasMetrics({startCustomers:1000,lostCustomers:40,newCustomers:100,acqSpend:10000,arpa:50,grossMarginPct:80,startMrr:50000,churnMrr:2000,contractionMrr:500,expansionMrr:1500,newMrr:5000});expect(r.cac).toBe(100);expect(r.simplifiedLtv).toBe(1000);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
