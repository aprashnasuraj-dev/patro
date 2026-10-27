import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"pace": "300", "altitude": "2000", "reference": "0", "effect": "2"};
describe("TOOL-0299 \u00b7 Altitude Pace Adjustment Calculator",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Estimated target pace')?.value).toBe('0:05:12 /km');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "pace": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
