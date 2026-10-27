import {describe,it,expect} from 'vitest';
import {gantt} from '../src/core';
describe('TOOL-0255 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=gantt([{task:'A',start:'2026-01-01',end:'2026-01-03',group:'',progress:50}]);expect(r.spanDays).toBe(3);expect(r.tasks[0].durationDays).toBe(3);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
