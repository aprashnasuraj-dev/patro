import { describe, it, expect } from 'vitest';
import { convert } from '../src/core';

describe('HAR redaction',()=>{
 const har=JSON.stringify({log:{entries:[{request:{method:'POST',url:'https://internal.local?token=SECRET',headers:[{name:'Authorization',value:'Bearer SECRET'}],postData:{text:'SECRET'}},response:{status:200,headers:[{name:'Set-Cookie',value:'SECRET'}],content:{text:'SECRET',size:33}},timings:{wait:20,receive:3},_private_extension:'SECRET'}]}});
 it('strips URLs, headers, bodies and extension fields',()=>{const r=convert(har);expect(r.text).not.toContain('SECRET');expect(r.text).not.toContain('internal.local');expect(r.details.HeadersRemoved).toBe(2);expect(r.text).toContain('redacted.invalid');});
 it('preserves status and meaningful timing',()=>{const parsed=JSON.parse(convert(har).text);expect(parsed.log.entries[0].response.status).toBe(200);expect(parsed.log.entries[0].timings.wait).toBe(20);});
 it('rejects malformed entries and oversized HAR',()=>{expect(()=>convert('{"log":{"entries":[{}]}}')).toThrow();expect(()=>convert('x'.repeat(3000001))).toThrow();});
});
