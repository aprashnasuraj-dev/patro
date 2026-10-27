import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"target": "100", "bar": "20", "collars": "0", "inventory": "25:2\n20:2\n15:1\n10:2\n5:2\n2.5:2\n1.25:2"};
describe("TOOL-0285 \u00b7 Barbell Plate Loading Calculator",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Loaded mass')?.value).toBe('100.00 kg');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "target": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
