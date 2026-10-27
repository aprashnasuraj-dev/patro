import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"dose": "150", "halflife": "5", "elapsed": "6"};
describe("TOOL-0290 \u00b7 Caffeine Half-Life Decay Calculator",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Remaining')?.value).toContain('65.3 mg');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "dose": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
