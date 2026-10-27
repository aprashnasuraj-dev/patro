import { describe,it,expect } from 'vitest';
import {calculate} from '../src/core.js';
const sample = {"ftp": "240", "mass": "75"};
describe("TOOL-0287 \u00b7 FTP Zones and Power-to-Weight Calculator",()=>{
 it('calculates a finite, explainable example',()=>{const r=calculate(sample);expect(r.metrics.length).toBeGreaterThan(0);expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity|undefined/);expect(r.warnings.length).toBeGreaterThan(0);});
 it('matches a known-answer example',()=>{const r=calculate(sample);expect(r.metrics.find(x=>x.label==='Power-to-weight')?.value).toBe('3.20 W/kg');});
 it('rejects omitted input',()=>{expect(()=>calculate({})).toThrow();});
 it('rejects unbounded or invalid numerical fields',()=>{const bad={...sample, "ftp": '9999999999999999999999999'};expect(()=>calculate(bad)).toThrow();});
 });
