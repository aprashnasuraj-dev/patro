import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"food": "Sample oats", "serving": "40", "servings": "10", "calories": "150", "fat": "3", "saturated": "0.5", "sodium": "0", "carb": "27", "fiber": "4", "added": "0", "protein": "5"};
describe("TOOL-0296 \u00b7 Nutrition Facts Label Generator",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.rows?.find(x=>x[0]==='Total Fat')?.[2]).toBe('4%');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "serving": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
