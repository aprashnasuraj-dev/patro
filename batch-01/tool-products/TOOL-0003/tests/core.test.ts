import { describe, it, expect } from 'vitest';
import { convert } from '../src/core';

describe('OpenAPI type drafts',()=>{
 it('maps required properties and OpenAPI 3.1 nullable arrays',()=>{
  const input=`openapi: 3.1.0\ncomponents:\n  schemas:\n    Job:\n      type: object\n      required: [id]\n      properties:\n        id: {type: string}\n        note: {type: [string, 'null']}\n`;
  const output=convert(input).text;expect(output).toContain('export type Job');expect(output).toContain('id: string');expect(output).toContain('note?: string | null');
 });
 it('fails closed on external $refs',()=>expect(()=>convert('openapi: 3.1.0\ncomponents:\n  schemas:\n    X:\n      $ref: https://example.invalid/x')).toThrow(/External/));
 it('refuses huge and malformed input',()=>{expect(()=>convert('x'.repeat(250001))).toThrow();expect(()=>convert('openapi: [')).toThrow();});
 it('rejects dangerous duplicate YAML keys',()=>expect(()=>convert('openapi: 3.1.0\nopenapi: 3.2.0')).toThrow());
});
