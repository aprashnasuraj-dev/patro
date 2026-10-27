import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"distance": "12", "ascent": "650", "descent": "100"};
describe("TOOL-0298 \u00b7 Hiking Time Estimator (Naismith and Tobler)",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Naismith')?.value).toBe('3.48 h');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "distance": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
