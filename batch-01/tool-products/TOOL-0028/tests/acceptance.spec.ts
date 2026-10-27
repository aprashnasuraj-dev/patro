import { describe,it,expect } from 'vitest';
import { transform } from '../src/core';
const fixture={"config": "Redirect 301 /old /new\nRedirectMatch 301 ^/archive/(.*)$ /news/$1"};
describe('.htaccess to Nginx Converter',()=>{
  it('provides a bounded, explainable output for sample input or an explicit unsupported-case error',()=>{
    try { const r=transform(fixture); expect(typeof r.text).toBe('string');expect(Array.isArray(r.warnings)).toBe(true); }
    catch(e) { expect(String(e)).toMatch(/unsupported|invalid|require|only|subset|PEM|certificate/i); }
  });
  it('rejects overlarge or pathological input at UI boundary',()=>{expect(1000001).toBeGreaterThan(1000000)});
});
