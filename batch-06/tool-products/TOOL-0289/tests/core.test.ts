import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"wake": "07:00", "latency": "20"};
describe("TOOL-0289 \u00b7 Sleep Cycle Bedtime Calculator",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.rows?.[1][1]).toBe('23:40');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "latency": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
