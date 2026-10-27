import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("JSONL / NDJSON to JSON Array Converter",()=>{it('collects NDJSON values and reports count',()=>{const r=convert('{"id":1}\n{"id":2}\n');expect(r.details?.records).toBe(2);expect(JSON.parse(r.text)).toHaveLength(2);});it('rejects any invalid line',()=>expect(()=>convert('{"id":1}\nbad')).toThrow(/line 2/));it('can reject blank lines',()=>expect(()=>convert('{}\n\n{}',{ignoreBlank:false})).toThrow());
});
