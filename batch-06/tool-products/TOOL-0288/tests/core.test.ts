import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"sex": "male", "mass": "75", "height": "175", "age": "30", "activity": "1.55"};
describe("TOOL-0288 \u00b7 TDEE Calculator Comparing Equations",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.rows?.[1][1]).toBe('1,699 kcal/day');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "mass": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
