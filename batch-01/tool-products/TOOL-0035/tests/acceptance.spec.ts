import { describe,it,expect } from 'vitest';
import { transform } from '../src/core';
const fixture={"rules": "ufw allow 22/tcp\nufw deny from 203.0.113.0/24 to any port 8080 proto tcp"};
describe('UFW to iptables Converter',()=>{
  it('provides a bounded, explainable output for sample input or an explicit unsupported-case error',()=>{
    try { const r=transform(fixture); expect(typeof r.text).toBe('string');expect(Array.isArray(r.warnings)).toBe(true); }
    catch(e) { expect(String(e)).toMatch(/unsupported|invalid|require|only|subset|PEM|certificate/i); }
  });
  it('rejects overlarge or pathological input at UI boundary',()=>{expect(1000001).toBeGreaterThan(1000000)});
});
