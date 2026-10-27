import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"start": "20", "weeks": "12", "increase": "5", "cutback": "4", "drop": "15"};
describe("TOOL-0293 \u00b7 Weekly Mileage Progression Planner",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.rows?.length).toBe(13);});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "start": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
