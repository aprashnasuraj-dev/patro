import { describe, it, expect } from 'vitest';
import { convert } from '../src/core';

describe('HAR -> curl commands',()=>{
 const payload=JSON.stringify({log:{entries:[{request:{method:'POST',url:"https://example.com/api?token=secret",headers:[{name:'Authorization',value:'Bearer secret'}, {name:'Accept',value:'application/json'}],postData:{text:'private body'}}}]}});
 it('omits auth, queries and body by default',()=>{const r=convert(payload);expect(r.text).not.toContain('secret');expect(r.text).not.toContain('private body');expect(r.text).toContain('--header');expect(r.details.OmittedBodies).toBe(1);});
 it('keeps opted-in body under deliberate option',()=>expect(convert(payload,{includeBodies:true}).text).toContain('private body'));
 it('quotes apostrophes for POSIX shells',()=>{const har=JSON.stringify({log:{entries:[{request:{method:'GET',url:"https://x.test/o'hare"}}]}});expect(convert(har).text).toContain("'\\''");});
 it('rejects unsafe protocols and malformed source',()=>expect(()=>convert('{"log":{"entries":[{"request":{"method":"GET","url":"file:///etc/passwd"}}]}}')).toThrow());
});
