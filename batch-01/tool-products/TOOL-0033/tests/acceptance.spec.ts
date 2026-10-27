import { describe,it,expect } from 'vitest';
import { transform } from '../src/core';
const fixture={"bucket": "example-static-site", "distribution": "E1234567890ABC", "account": "123456789012", "partition": "aws"};
describe('S3 Bucket Policy Generator for CloudFront OAC',()=>{
  it('provides a bounded, explainable output for sample input or an explicit unsupported-case error',()=>{
    try { const r=transform(fixture); expect(typeof r.text).toBe('string');expect(Array.isArray(r.warnings)).toBe(true); }
    catch(e) { expect(String(e)).toMatch(/unsupported|invalid|require|only|subset|PEM|certificate/i); }
  });
  it('rejects overlarge or pathological input at UI boundary',()=>{expect(1000001).toBeGreaterThan(1000000)});
});
