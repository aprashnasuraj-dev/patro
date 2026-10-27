import {describe,it,expect} from 'vitest';
import {invoice} from '../src/core';
describe('TOOL-0242 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{expect(invoice({number:'I1',currency:'USD',issueDate:'2026-01-01',dueDate:'2026-01-31',seller:'S',customer:'C',notes:'',lines:[{description:'A',quantity:2,unitPrice:10,taxRate:20}]}).gross).toBe(24);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
