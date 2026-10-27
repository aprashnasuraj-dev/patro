import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("MongoDB Extended JSON to Plain JSON",()=>{it('preserves Decimal128 precision in a tagged JSON wrapper',()=>{const r=convert('{"a":{"$numberDecimal":"12.30"}}');expect(r.text).toContain('Decimal128');expect(r.text).toContain('12.30');});it('rejects malformed ObjectId',()=>expect(()=>convert('{"_id":{"$oid":"oops"}}')).toThrow());
});
