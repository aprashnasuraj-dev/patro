import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"work": "20", "rest": "10", "rounds": "8", "sets": "1", "between": "60", "warmup": "0", "cooldown": "0"};
describe("TOOL-0291 \u00b7 HIIT and Tabata Interval Timer",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Total duration')?.value).toBe('0:03:50');expect(r.rows?.length).toBe(15);});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "work": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
