import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "sender": "Exporter Ltd; Address; Country",
  "recipient": "Importer Inc; Address; Country",
  "currency": "USD",
  "invoice": "INV-001",
  "items": "Cotton shirt|3|12.5|610910|NP|0.75",
  "reason": "sale"
};
describe('TOOL-0479 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Invoice goods value");expect(o?.value).toBe("USD 37.50");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
