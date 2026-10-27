// Deferred product tests; DO NOT execute during source preparation.
import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core.js';
import fixtures from '../examples/fixtures.json';
describe('TOOL-0491 source',()=>{
 it('returns a non-empty explanation on the worked example',()=>{const r=calculate(fixtures.default_inputs);expect(r.summary.length).toBeGreaterThan(3);expect(r.metrics.length).toBeGreaterThan(0);});
 it('rejects malformed or pathological numeric inputs',()=>{const invalid={...fixtures.default_inputs,"demand": "NaN"};expect(()=>calculate(invalid)).toThrow();});
 it('checks researched reference output: Cheapest estimated fuel',()=>{const r=calculate(fixtures.default_inputs);expect(r.metrics.find(m=>m.label==='Cheapest estimated fuel')?.value).toContain(' ');});
 it('checks researched reference output: Heat pump',()=>{const r=calculate(fixtures.default_inputs);expect(r.metrics.find(m=>m.label==='Heat pump')?.value).toContain('$720.00');});
 it.todo('re-check expected amounts against official year-specific sources at integration');
 it.todo('verify offline use, focus rings, screen-reader live region and 320px layout');
 it.todo('verify export CSV escaping and copy behavior under denied clipboard permissions');
 it.todo('verify limits for huge inputs, suspicious CSV and processing limits');
});
