import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("package-lock.json Duplicate Dependency Finder",()=>{it('groups duplicate lockfile installations by package name',()=>{const data={lockfileVersion:3,packages:{'node_modules/a':{version:'1.0.0'},'node_modules/b/node_modules/a':{version:'2.0.0'}}};const r=JSON.parse(convert(JSON.stringify(data)).text);expect(r.duplicatePackages[0].name).toBe('a');expect(r.duplicatePackages[0].versions).toHaveLength(2);});it('rejects unsupported lockfile versions',()=>expect(()=>convert('{"lockfileVersion":1,"packages":{}}')).toThrow());
});
