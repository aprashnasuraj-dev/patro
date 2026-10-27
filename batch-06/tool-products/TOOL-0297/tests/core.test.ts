import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"steps": "10000", "stride": "0.75", "cadence": "110", "weight": "70", "met": "3.5"};
describe("TOOL-0297 \u00b7 Steps to Distance and Calories Converter",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Distance')?.value).toBe('7.50 km');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "steps": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
