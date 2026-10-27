import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={
  "basis": "EU GDPR Article 15",
  "name": "Alex Example",
  "recipient": "Example Company Data Protection Team",
  "contact": "alex@example.test",
  "scope": "Account profile and purchase history"
};
describe('TOOL-0464 deferred validation',()=>{
 it('matches documented worked example',()=>{const o=calculate(sample).outputs.find(x=>x.label==="Selected legal framework");expect(o?.value).toBe("EU GDPR Article 15");});
 it('returns explanation and legal/safety boundaries',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
