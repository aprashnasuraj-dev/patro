import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "exam": "SAT",
  "attempts": "650,700\n720,680",
  "school": "Specific admissions office",
  "policy": "Unknown — must verify"
};
describe('TOOL-0466 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Computed section superscore");expect(o?.value).toBe("1420");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
