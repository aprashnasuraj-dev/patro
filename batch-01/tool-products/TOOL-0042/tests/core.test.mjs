import test from 'node:test';
import assert from 'node:assert/strict';
import {compute} from '../src/core.js';
// Authored tests only. Deliberately NOT run during source preparation.
test("Created maps 201",()=>{assert.ok(compute({scenario:'created',method:'POST'}).text.includes('201 Created'));});
test("Unknown scenario rejected",()=>{assert.throws(()=>compute({scenario:'999',method:'GET'}));});
