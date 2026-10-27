import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"knownDistance": "5", "knownSeconds": "1500", "targetDistance": "10"};
describe("TOOL-0283 \u00b7 Race Time Predictor (Riegel and Cameron)",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.rows?.[0][2]).toBe('0:52:07');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "knownDistance": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
