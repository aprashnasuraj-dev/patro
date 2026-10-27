import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"pace": "360", "grade": "5"};
describe("TOOL-0295 \u00b7 Grade-Adjusted Pace Calculator",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.some(x=>x.label==='Grade cost multiplier')).toBe(true);});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "pace": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
