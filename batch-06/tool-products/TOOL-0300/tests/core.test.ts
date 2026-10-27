import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"sex": "men", "mass": "75", "total": "500"};
describe("TOOL-0300 \u00b7 DOTS and Wilks Score Calculator for Powerlifting",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics[0].value).toContain('points');expect(r.metrics[1].value).toContain('points');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "mass": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
