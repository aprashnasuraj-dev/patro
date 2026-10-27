import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"age": "35", "resting": "60", "measuredMax": "0"};
describe("TOOL-0284 \u00b7 Heart Rate Zone Calculator (Karvonen and %Max)",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Maximum used')?.value).toBe('184 bpm');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "age": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
