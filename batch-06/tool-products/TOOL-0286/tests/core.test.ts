import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"t400": "450", "t200": "205"};
describe("TOOL-0286 \u00b7 Critical Swim Speed (CSS) Calculator",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='CSS / 100 m')?.value).toBe('0:02:03');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "t400": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
