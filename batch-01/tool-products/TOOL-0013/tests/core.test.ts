import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("JSON to PostgreSQL Upsert Generator",()=>{it('emits bindable placeholders and conflict update',()=>{const r=convert('[{"id":1,"name":"Ada"}]');expect(r.text).toContain('ON CONFLICT ("id") DO UPDATE');expect(r.text).toContain('$1');expect(r.text).toContain('PARAMETERS_JSON_BEGIN');});it('refuses inconsistent keys, nested values and injection in names',()=>{expect(()=>convert('[{"id":1},{"id":2,"x":1}]')).toThrow();expect(()=>convert('{"id":1,"x":{}}')).toThrow();expect(()=>convert('{"id":1}',{tableName:'x; DROP TABLE users'})).toThrow();});
});
