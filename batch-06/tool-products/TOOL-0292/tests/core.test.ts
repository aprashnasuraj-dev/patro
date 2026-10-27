import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"pattern": "box", "cycles": "5"};
describe("TOOL-0292 \u00b7 Box Breathing and 4-7-8 Breathing Pacer",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Session duration')?.value).toBe('0:01:20');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "cycles": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
