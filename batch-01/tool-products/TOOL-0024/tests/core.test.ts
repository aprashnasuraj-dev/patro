import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("Dockerfile Linter and Layer Cache Advisor",()=>{it('flags install commands after broad context COPY',()=>{const r=JSON.parse(convert('FROM node:22\nCOPY . .\nRUN npm install').text);expect(r.findings.some((f:any)=>f.code==='LATE_INSTALL')).toBe(true);});it('rejects a Dockerfile without FROM',()=>expect(()=>convert('RUN echo hi')).toThrow());
});
