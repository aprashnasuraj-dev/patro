import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Path segment escapes slash",()=>{assert.ok(compute({value:'a/b',context:'Path segment'}).text.includes('a%2Fb'));});
test("Whole path preserves slash",()=>{assert.ok(compute({value:'a/b',context:'Whole path'}).text.includes('a/b'));});
test("Form space plus",()=>{assert.ok(compute({value:'a b',context:'Form value'}).text.includes('a+b'));});
