// Deferred, not executed. Values are independent expected-answer examples.
import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core.js';
import scenario from '../examples/fixtures.json';
describe('TOOL-0512 official worked example regression',()=>{
 it('computes the independently specified result',()=>{
  const report=calculate(scenario.default_inputs);
  const metric=report.metrics.find(m=>m.label==='Remaining after entered current-year deposits');
  expect(metric).toBeDefined();
  expect(metric!.value).toContain('C$16,000.00');
 });
});
