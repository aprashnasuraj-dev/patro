import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core.js';
import scenario from '../examples/fixtures.json';
describe('TOOL-0528',()=>{
  it('produces an explained worked example',()=>{ const x=calculate(scenario.default_inputs);expect(x.summary.length).toBeGreaterThan(4);expect(x.metrics.length).toBeGreaterThan(2);expect(x.warnings.length).toBeGreaterThan(0); });
  it('rejects missing mandatory first field',()=>{ const x={...scenario.default_inputs};delete (x as any)['length'];expect(()=>calculate(x)).toThrow(); });
  it.todo('compare exact known-answer figures against official primary source example and accepted rounding');
  it.todo('test zero, maximum, unsupported and precision cases specific to Quilt Yardage, Backing and Binding Calculator');
  it.todo('test malformed CSV, overlong input, HTML injection, formula-injection on export and date ranges');
  it.todo('keyboard, focus, live region, 320px reflow, dark mode, reduced motion, clipboard-denied path');
  it.todo('offline route-lazy-load and local-only execution; no outgoing user input requests');
});
