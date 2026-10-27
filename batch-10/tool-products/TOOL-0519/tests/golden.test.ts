// Deferred, not executed. Values are independent expected-answer examples.
import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core.js';
import scenario from '../examples/fixtures.json';
describe('TOOL-0519 official worked example regression',()=>{
 it('computes the independently specified result',()=>{
  const report=calculate(scenario.default_inputs);
  const metric=report.metrics.find(m=>m.label==='Annualized current monthly income');
  expect(metric).toBeDefined();
  expect(metric!.value).toContain('$60,600.00');
 });
});
