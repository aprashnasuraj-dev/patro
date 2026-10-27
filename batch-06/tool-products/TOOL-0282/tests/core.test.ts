import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"distance": "10", "seconds": "3000", "segment": "1"};
describe("TOOL-0282 \u00b7 Running Pace Calculator with Split Export",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Pace per km')?.value).toBe('0:05:00');expect(r.rows?.length).toBe(10);expect(r.csv).toContain('Elapsed time');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "distance": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
