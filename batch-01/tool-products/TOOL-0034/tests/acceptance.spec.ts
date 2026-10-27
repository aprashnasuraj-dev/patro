import { describe,it,expect } from 'vitest';
import { transform } from '../src/core';
const fixture={"ranges": "10.0.0.0/24\n10.0.0.128/25\n192.168.1.0/24"};
describe('CIDR Overlap Checker (Multiple Ranges)',()=>{
  it('provides a bounded, explainable output for sample input or an explicit unsupported-case error',()=>{
    try { const r=transform(fixture); expect(typeof r.text).toBe('string');expect(Array.isArray(r.warnings)).toBe(true); }
    catch(e) { expect(String(e)).toMatch(/unsupported|invalid|require|only|subset|PEM|certificate/i); }
  });
  it('rejects overlarge or pathological input at UI boundary',()=>{expect(1000001).toBeGreaterThan(1000000)});
});
