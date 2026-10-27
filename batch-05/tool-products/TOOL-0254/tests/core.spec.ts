import {describe,it,expect} from 'vitest';
import {signature} from '../src/core';
describe('TOOL-0254 deferred core plan',()=>{
  it('matches prepared known-answer behavior',()=>{const r=signature({name:'Ada',title:'',company:'',email:'ada@example.com',phone:'',website:'https://example.com',address:'',accent:'#1d4ed8'});expect(r.html).toContain('Ada');expect(r.html).not.toContain('<script');});
  it.todo('rejects malformed, NaN, Infinity and out-of-domain numeric inputs');
  it.todo('covers lower/upper bounds and unsupported combinations');
  it.todo('checks output rounding/formatting semantics');
  it.todo('covers parser-abuse and oversized-input paths where applicable');
});
