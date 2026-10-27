import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("CSV to SQL CREATE TABLE (Type-Inferred)",()=>{it('infers types without inventing primary keys',()=>{const r=convert('id,price,active\n1,2.50,true\n2,3.99,false');expect(r.text).toContain('"price" NUMERIC');expect(r.text).toContain('"active" BOOLEAN');expect(r.text).not.toContain('PRIMARY KEY');});it('rejects malformed column widths and duplicates',()=>{expect(()=>convert('x,y\n1')).toThrow();expect(()=>convert('x,x\n1,2')).toThrow();});
});
