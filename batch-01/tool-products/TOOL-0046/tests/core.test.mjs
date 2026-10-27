import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Nested array",()=>{assert.ok(compute({query:'user[name]=Ana&tags[0]=red&tags[1]=blue',duplicate:'Array'}).text.includes('tags'));});
test("Proto pollution denied",()=>{assert.throws(()=>compute({query:'__proto__[polluted]=1',duplicate:'Array'}));});
test("Sparse array refused",()=>{assert.throws(()=>compute({query:'items[1]=a',duplicate:'Array'}));});
test("Duplicate scalar arrays",()=>{assert.ok(compute({query:'k=a&k=b',duplicate:'Array'}).text.includes('k'));});
