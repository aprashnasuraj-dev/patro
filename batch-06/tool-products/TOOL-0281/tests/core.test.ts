import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"weight": "80", "reps": "5"};
describe("TOOL-0281 \u00b7 One-Rep Max Calculator (Multi-Formula)",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.rows?.find(x=>x[0]==='Epley')?.[1]).toContain('93.33');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "weight": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
