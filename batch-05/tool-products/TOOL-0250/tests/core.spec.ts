import {describe,it,expect} from 'vitest';
import {timesheet} from '../src/core';
describe('TOOL-0250 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=timesheet([{date:'2026-10-26',start:'09:00',end:'18:00',breakMinutes:60}],8,40,1.5);expect(r.totalWorked).toBe(8);expect(r.dailyOvertimeHours).toBe(0);});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
