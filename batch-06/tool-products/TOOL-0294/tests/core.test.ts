import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"duration": "3", "target": "60", "portion": "25", "every": "30"};
describe("TOOL-0294 \u00b7 Endurance Fueling Calculator (Carbs per Hour)",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Total carbs')?.value).toBe('180.0 g');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "duration": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
