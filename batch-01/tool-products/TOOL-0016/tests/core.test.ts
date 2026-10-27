import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("Nginx / Apache Access Log to CSV",()=>{it('parses combined access log and quotes fields',()=>{const r=convert('127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET / HTTP/1.1" 200 4 "-" "Browser"');expect(r.text).toContain('"127.0.0.1"');expect(r.details?.parsed).toBe(1);});it('rejects malformed lines in strict mode',()=>expect(()=>convert('invalid')).toThrow());
});
